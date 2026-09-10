// src/components/community/__tests__/CommunityMembersList.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityMembersList } from "@/components/community";
import type { TopicData, CommunityUser } from "@/components/community/types";

const mockTopics: TopicData[] = [
    {
        id: "1",
        title: "General Chat",
        content: "General discussion content",
        category: "General",
        createdAt: new Date("2024-01-01T10:00:00Z"),
        user: {
            id: "u1",
            name: "Alice",
            image: null,
            role: "member",
        },
        _count: { replies: 5 },
    },
    {
        id: "2",
        title: "Research Hub",
        content: "Research findings",
        category: "Research",
        createdAt: new Date("2024-01-02T10:00:00Z"),
        user: {
            id: "u2",
            name: "Bob",
            image: null,
            role: "member",
        },
        _count: { replies: 0 },
    },
    {
        id: "3",
        title: "Other stuff",
        content: "Miscellaneous",
        category: "Other",
        createdAt: new Date("2024-01-03T10:00:00Z"),
        user: {
            id: "u3",
            name: "Charlie",
            image: null,
            role: "member",
        },
        _count: { replies: 2 },
    },
];

const mockUsers: CommunityUser[] = [
    { id: "u1", name: "Alice", image: null, role: "member" },
    { id: "u2", name: "Bob", image: null, role: "member" },
    { id: "u3", name: "Charlie", image: null, role: "member" },
];

const defaultProps: React.ComponentProps<typeof CommunityMembersList> = {
    topics: mockTopics,
    selectedTopicId: null,
    isAdmin: false,
    users: mockUsers,
    onSelectTopic: jest.fn(),
    onDeleteTopic: jest.fn(),
    onShowCreate: jest.fn(),
};

describe("CommunityMembersList", () => {
    beforeEach(() => jest.clearAllMocks());

    it("renders header, categories, and topics", () => {
        render(<CommunityMembersList {...defaultProps} />);
        expect(screen.getByText("CNERSH Community")).toBeInTheDocument();
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.getByText("general-chat")).toBeInTheDocument();
        expect(screen.getByText("Research")).toBeInTheDocument();
        expect(screen.getByText("research-hub")).toBeInTheDocument();
        expect(screen.getByText("Other")).toBeInTheDocument();
        expect(screen.getByText("other-stuff")).toBeInTheDocument();
    });

    it("highlights the selected topic", () => {
        render(<CommunityMembersList {...defaultProps} selectedTopicId="1" />);
        // Find the clickable wrapper (role="button") for the "general-chat" item
        const wrapper = screen.getByText("general-chat").closest('[role="button"]');
        expect(wrapper).toHaveClass("bg-gray-200");
    });

    it("calls onSelectTopic when a topic is clicked", () => {
        render(<CommunityMembersList {...defaultProps} />);
        const wrapper = screen.getByText("general-chat").closest('[role="button"]');
        expect(wrapper).not.toBeNull();
        fireEvent.click(wrapper!);
        expect(defaultProps.onSelectTopic).toHaveBeenCalledWith("1");
    });

    it("shows delete button only when isAdmin is true", () => {
        const { rerender } = render(<CommunityMembersList {...defaultProps} />);
        expect(screen.queryByTitle("Delete channel")).toBeNull();

        rerender(<CommunityMembersList {...defaultProps} isAdmin={true} />);
        expect(screen.getAllByTitle("Delete channel")).toHaveLength(3);
    });

    it("calls onDeleteTopic and stops event propagation", () => {
        const onDelete = jest.fn();
        render(
            <CommunityMembersList {...defaultProps} isAdmin={true} onDeleteTopic={onDelete} />
        );
        const deleteBtn = screen.getAllByTitle("Delete channel")[0];
        fireEvent.click(deleteBtn);
        expect(onDelete).toHaveBeenCalledWith("1");
        expect(defaultProps.onSelectTopic).not.toHaveBeenCalled();
    });

    it("calls onShowCreate when Create Channel button is clicked", () => {
        render(<CommunityMembersList {...defaultProps} />);
        fireEvent.click(screen.getByText("Create Channel"));
        expect(defaultProps.onShowCreate).toHaveBeenCalled();
    });

    it("displays member count", () => {
        render(<CommunityMembersList {...defaultProps} />);
        expect(screen.getByText("3 members")).toBeInTheDocument();
    });
});