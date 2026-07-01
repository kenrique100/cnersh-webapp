import React from "react";
import { render, screen, act } from "@testing-library/react";

jest.mock("recharts", () => {
    const actual = jest.requireActual<typeof import("recharts")>("recharts");
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="responsive-container">{children}</div>
        ),
        PieChart: ({ children }: { children?: React.ReactNode }) => (
            <div data-testid="pie-chart">{children}</div>
        ),
        Pie: ({ data }: { data?: { name: string; value: number }[] }) => (
            <div data-testid="pie">
                {data?.map((d) => (
                    <span key={d.name} data-testid={`pie-slice-${d.name.toLowerCase()}`}>
            {d.name}:{d.value}
          </span>
                ))}
            </div>
        ),
        Cell: () => <div data-testid="cell" />,
        BarChart: ({
                       children,
                       data,
                   }: {
            children?: React.ReactNode;
            data?: { name: string; count: number }[];
        }) => (
            <div data-testid="bar-chart">
                {data?.map((d) => (
                    <span key={d.name} data-testid={`bar-${d.name.toLowerCase()}`}>
            {d.name}:{d.count}
          </span>
                ))}
                {children}
            </div>
        ),
        Bar: () => <div data-testid="bar" />,
        XAxis: () => <div data-testid="x-axis" />,
        YAxis: () => <div data-testid="y-axis" />,
        CartesianGrid: () => <div data-testid="cartesian-grid" />,
        Tooltip: () => <div data-testid="tooltip" />,
        Legend: () => <div data-testid="legend" />,
    };
});

import AdminCharts from "@/components/admin-charts";

function buildStats(
    overrides: Partial<{
        totalUsers: number;
        activeUsers: number;
        bannedUsers: number;
        totalPosts: number;
        totalProjects: number;
        approvedProjects: number;
        rejectedProjects: number;
        pendingProjects: number;
        totalTopics: number;
        pendingReports: number;
    }> = {}
) {
    return {
        totalUsers: 100,
        activeUsers: 80,
        bannedUsers: 20,
        totalPosts: 50,
        totalProjects: 40,
        approvedProjects: 25,
        rejectedProjects: 5,
        pendingProjects: 10,
        totalTopics: 30,
        pendingReports: 3,
        ...overrides,
    };
}

describe("AdminCharts", () => {
    describe("Skeleton / loading state", () => {
        it("renders without crashing before useEffect fires", () => {
            // @testing-library/react wraps render in act, which flushes effects.
            // To capture the pre-mount branch we intercept useState via jest.fn()
            // assigned through Object.defineProperty so TypeScript doesn't complain
            // about the signature mismatch from mockImplementation.
            const realUseState = React.useState;
            let firstCall = true;

            // Use Object.defineProperty so we can reassign the read-only property
            // without triggering TS overload checks on mockImplementation.
            const fakeFn = jest.fn().mockImplementation(
                // typed as unknown to satisfy jest.fn()'s flexible signature
                (init: unknown): [unknown, jest.Mock] | ReturnType<typeof realUseState> => {
                    if (firstCall) {
                        firstCall = false;
                        // Keep mounted = false so the skeleton branch runs.
                        return [false, jest.fn()];
                    }
                    return realUseState(init);
                }
            );

            Object.defineProperty(React, "useState", { value: fakeFn, writable: true, configurable: true });

            const { container } = render(<AdminCharts stats={buildStats()} />);
            expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);

            // Restore the real useState immediately after the test.
            Object.defineProperty(React, "useState", { value: realUseState, writable: true, configurable: true });
        });
    });

    describe("Mounted state (after useEffect fires)", () => {
        describe("Section headings", () => {
            it("renders the User Distribution heading", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats()} />);
                });
                expect(screen.getByText(/user distribution/i)).toBeInTheDocument();
            });

            it("renders the Protocol Status heading", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats()} />);
                });
                expect(screen.getByText(/protocol status/i)).toBeInTheDocument();
            });

            it("renders the Content Overview heading", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats()} />);
                });
                expect(screen.getByText(/content overview/i)).toBeInTheDocument();
            });
        });

        describe("User Distribution", () => {
            it("renders Active slice with correct value", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 70, bannedUsers: 30 })} />);
                });
                expect(screen.getByTestId("pie-slice-active")).toHaveTextContent("Active:70");
            });

            it("renders Banned slice with correct value", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 70, bannedUsers: 30 })} />);
                });
                expect(screen.getByTestId("pie-slice-banned")).toHaveTextContent("Banned:30");
            });

            it("shows No user data fallback when both are zero", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 0, bannedUsers: 0 })} />);
                });
                expect(screen.getByText(/no user data/i)).toBeInTheDocument();
            });

            it("hides user ResponsiveContainer when data is empty", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 0, bannedUsers: 0 })} />);
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
            });

            it("filters out zero Banned slice", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 50, bannedUsers: 0 })} />);
                });
                expect(screen.getByTestId("pie-slice-active")).toBeInTheDocument();
                expect(screen.queryByTestId("pie-slice-banned")).not.toBeInTheDocument();
            });

            it("filters out zero Active slice", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 0, bannedUsers: 15 })} />);
                });
                expect(screen.getByTestId("pie-slice-banned")).toBeInTheDocument();
                expect(screen.queryByTestId("pie-slice-active")).not.toBeInTheDocument();
            });
        });

        describe("Protocol Status", () => {
            it("renders Approved slice", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ approvedProjects: 10, pendingProjects: 5, rejectedProjects: 2 })} />);
                });
                expect(screen.getByTestId("pie-slice-approved")).toHaveTextContent("Approved:10");
            });

            it("renders Pending slice", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ approvedProjects: 10, pendingProjects: 5, rejectedProjects: 2 })} />);
                });
                expect(screen.getByTestId("pie-slice-pending")).toHaveTextContent("Pending:5");
            });

            it("renders Rejected slice", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ approvedProjects: 10, pendingProjects: 5, rejectedProjects: 2 })} />);
                });
                expect(screen.getByTestId("pie-slice-rejected")).toHaveTextContent("Rejected:2");
            });

            it("shows No protocol data fallback when all are zero", async () => {
                await act(async () => {
                    render(
                        <AdminCharts stats={buildStats({ approvedProjects: 0, pendingProjects: 0, rejectedProjects: 0 })} />
                    );
                });
                expect(screen.getByText(/no protocol data/i)).toBeInTheDocument();
            });

            it("hides protocol ResponsiveContainer when data is empty", async () => {
                await act(async () => {
                    render(
                        <AdminCharts stats={buildStats({ approvedProjects: 0, pendingProjects: 0, rejectedProjects: 0 })} />
                    );
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
            });

            it("filters out zero Pending slice", async () => {
                await act(async () => {
                    render(
                        <AdminCharts stats={buildStats({ approvedProjects: 8, pendingProjects: 0, rejectedProjects: 3 })} />
                    );
                });
                expect(screen.getByTestId("pie-slice-approved")).toBeInTheDocument();
                expect(screen.queryByTestId("pie-slice-pending")).not.toBeInTheDocument();
                expect(screen.getByTestId("pie-slice-rejected")).toBeInTheDocument();
            });
        });

        describe("Content Overview", () => {
            it("renders the bar-chart container", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats()} />);
                });
                expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
            });

            it("renders Posts bar", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ totalPosts: 42 })} />);
                });
                expect(screen.getByTestId("bar-posts")).toHaveTextContent("Posts:42");
            });

            it("renders Protocols bar", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ totalProjects: 18 })} />);
                });
                expect(screen.getByTestId("bar-protocols")).toHaveTextContent("Protocols:18");
            });

            it("renders Discussions bar", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ totalTopics: 9 })} />);
                });
                expect(screen.getByTestId("bar-discussions")).toHaveTextContent("Discussions:9");
            });

            it("renders Reports bar", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ pendingReports: 7 })} />);
                });
                expect(screen.getByTestId("bar-reports")).toHaveTextContent("Reports:7");
            });

            it("renders all four bars even when all counts are zero", async () => {
                await act(async () => {
                    render(
                        <AdminCharts
                            stats={buildStats({ totalPosts: 0, totalProjects: 0, totalTopics: 0, pendingReports: 0 })}
                        />
                    );
                });
                expect(screen.getByTestId("bar-posts")).toHaveTextContent("Posts:0");
                expect(screen.getByTestId("bar-protocols")).toHaveTextContent("Protocols:0");
                expect(screen.getByTestId("bar-discussions")).toHaveTextContent("Discussions:0");
                expect(screen.getByTestId("bar-reports")).toHaveTextContent("Reports:0");
            });

            it("always renders the Content Overview container when both pies are empty", async () => {
                await act(async () => {
                    render(
                        <AdminCharts
                            stats={buildStats({
                                activeUsers: 0,
                                bannedUsers: 0,
                                approvedProjects: 0,
                                pendingProjects: 0,
                                rejectedProjects: 0,
                            })}
                        />
                    );
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(1);
            });
        });

        describe("ResponsiveContainer count", () => {
            it("renders three containers when all data is present", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats()} />);
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(3);
            });

            it("renders two containers when user pie is empty", async () => {
                await act(async () => {
                    render(<AdminCharts stats={buildStats({ activeUsers: 0, bannedUsers: 0 })} />);
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
            });

            it("renders two containers when protocol pie is empty", async () => {
                await act(async () => {
                    render(
                        <AdminCharts stats={buildStats({ approvedProjects: 0, pendingProjects: 0, rejectedProjects: 0 })} />
                    );
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
            });

            it("renders one container when both pies are empty", async () => {
                await act(async () => {
                    render(
                        <AdminCharts
                            stats={buildStats({
                                activeUsers: 0,
                                bannedUsers: 0,
                                approvedProjects: 0,
                                pendingProjects: 0,
                                rejectedProjects: 0,
                            })}
                        />
                    );
                });
                expect(screen.getAllByTestId("responsive-container")).toHaveLength(1);
            });
        });
    });
});