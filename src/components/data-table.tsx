"use client";

import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const MOBILE_BREAKPOINT_PX = 640;

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    /**
     * Case 17: Optional stacked-card renderer for phone viewports.
     *
     * When provided, the component renders cards instead of a table on
     * viewports narrower than 640px. Admin tables can keep the horizontal
     * scroll table by not passing this prop. User-facing tables should pass
     * it so rows are readable without horizontal scrolling at 320–412px.
     */
    renderMobileCard?: (row: TData, index: number) => React.ReactNode;
    /** Placeholder for the filter input. Defaults to "Filter emails...". */
    filterPlaceholder?: string;
    /** Column id used by the filter input. Defaults to "email". */
    filterColumnId?: string;
}

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mql = window.matchMedia(
            `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`
        );
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, []);

    return isMobile;
}

export function DataTable<TData, TValue>({
                                             data,
                                             columns,
                                             renderMobileCard,
                                             filterPlaceholder = "Filter emails...",
                                             filterColumnId = "email",
                                         }: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    );
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const isMobile = useIsMobile();

    // Auto-hide less important columns on small screens.
    // Ignored when renderMobileCard is supplied (cards take over on mobile).
    React.useEffect(() => {
        if (isMobile) {
            setColumnVisibility((prev) => ({
                ...prev,
                select: false,
                emailVerified: false,
                banned: false,
            }));
        } else {
            setColumnVisibility((prev) => ({
                ...prev,
                select: true,
                emailVerified: true,
                banned: true,
            }));
        }
    }, [isMobile]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    const rows = table.getRowModel().rows;
    const useCards = isMobile && typeof renderMobileCard === "function";
    const filterColumn = table.getColumn(filterColumnId);

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 py-4">
                {filterColumn ? (
                    <Input
                        placeholder={filterPlaceholder}
                        value={(filterColumn.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            filterColumn.setFilterValue(event.target.value)
                        }
                        className="w-full sm:max-w-sm min-h-10"
                    />
                ) : null}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="ml-0 sm:ml-auto w-full sm:w-auto min-h-10"
                        >
                            Columns <ChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {useCards ? (
                <div className="space-y-3">
                    {rows.length > 0 ? (
                        rows.map((row, index) => (
                            <div
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {renderMobileCard!(row.original, index)}
                            </div>
                        ))
                    ) : (
                        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                            No results.
                        </div>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[600px]">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {rows.length > 0 ? (
                                rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-4">
                <div className="text-muted-foreground text-sm text-center sm:text-left">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="min-h-10"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="min-h-10"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}