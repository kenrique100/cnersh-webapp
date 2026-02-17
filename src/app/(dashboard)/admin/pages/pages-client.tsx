"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, TrashIcon, UploadIcon, FileTextIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPage, deletePage, addPageItem, deletePageItem } from "@/app/actions/page";

interface PageItem {
    id: string;
    name: string;
    url: string | null;
    fileUrl: string | null;
    pageId: string;
    createdAt: string;
}

interface Page {
    id: string;
    name: string;
    items: PageItem[];
    createdAt: string;
    updatedAt: string;
}

interface NewItem {
    name: string;
    url: string;
    file: File | null;
}

export default function AdminPagesClient({ pages }: { pages: Page[] }) {
    const router = useRouter();
    const [pageName, setPageName] = useState("");
    const [items, setItems] = useState<NewItem[]>([{ name: "", url: "", file: null }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For adding items to existing pages
    const [addingToPage, setAddingToPage] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<NewItem>({ name: "", url: "", file: null });
    const [isAddingItem, setIsAddingItem] = useState(false);

    const addItemRow = () => {
        setItems([...items, { name: "", url: "", file: null }]);
    };

    const removeItemRow = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof NewItem, value: string | File | null) => {
        const updated = [...items];
        if (field === "file") {
            updated[index] = { ...updated[index], file: value as File | null };
        } else {
            updated[index] = { ...updated[index], [field]: value as string };
        }
        setItems(updated);
    };

    const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Upload failed");
        }
        const data = await res.json();
        return data.url;
    };

    const handleCreatePage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pageName.trim()) {
            toast.error("Page name is required");
            return;
        }

        const validItems = items.filter((item) => item.name.trim());
        if (validItems.length === 0) {
            toast.error("At least one item with a name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const itemsData: { name: string; url?: string; fileUrl?: string }[] = [];

            for (const item of validItems) {
                let fileUrl: string | undefined;
                if (item.file) {
                    fileUrl = await uploadFile(item.file);
                }
                itemsData.push({
                    name: item.name.trim(),
                    url: item.url.trim() || undefined,
                    fileUrl,
                });
            }

            await createPage({ name: pageName.trim(), items: itemsData });
            toast.success("Page created successfully");
            setPageName("");
            setItems([{ name: "", url: "", file: null }]);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create page");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePage = async (pageId: string) => {
        if (!confirm("Are you sure you want to delete this page?")) return;
        try {
            await deletePage(pageId);
            toast.success("Page deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete page");
        }
    };

    const handleAddItem = async (pageId: string) => {
        if (!newItem.name.trim()) {
            toast.error("Item name is required");
            return;
        }

        setIsAddingItem(true);
        try {
            let fileUrl: string | undefined;
            if (newItem.file) {
                fileUrl = await uploadFile(newItem.file);
            }
            await addPageItem(pageId, {
                name: newItem.name.trim(),
                url: newItem.url.trim() || undefined,
                fileUrl,
            });
            toast.success("Item added");
            setNewItem({ name: "", url: "", file: null });
            setAddingToPage(null);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add item");
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Delete this item?")) return;
        try {
            await deletePageItem(itemId);
            toast.success("Item deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete item");
        }
    };

    return (
        <div className="flex flex-col px-3 sm:px-8 py-4 sm:py-6 w-full max-w-4xl mx-auto">
            <h1 className="text-lg font-semibold mb-4">Manage Pages</h1>

            {/* Create New Page */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-sm">Create New Page</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreatePage} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Page Name
                            </label>
                            <Input
                                value={pageName}
                                onChange={(e) => setPageName(e.target.value)}
                                placeholder="e.g. Resources, Ethical Clearance"
                                className="mt-1"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Page Items
                            </label>
                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col sm:flex-row gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900"
                                >
                                    <Input
                                        value={item.name}
                                        onChange={(e) => updateItem(index, "name", e.target.value)}
                                        placeholder="Item name *"
                                        className="flex-1"
                                    />
                                    <Input
                                        value={item.url}
                                        onChange={(e) => updateItem(index, "url", e.target.value)}
                                        placeholder="URL (optional)"
                                        className="flex-1"
                                    />
                                    <div className="flex gap-2 items-center">
                                        <label className="cursor-pointer flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1.5">
                                            <UploadIcon className="w-3 h-3" />
                                            {item.file ? item.file.name.slice(0, 15) + "..." : "Upload"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) =>
                                                    updateItem(index, "file", e.target.files?.[0] || null)
                                                }
                                            />
                                        </label>
                                        {items.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItemRow(index)}
                                                className="text-red-500 hover:text-red-700 h-8 w-8"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addItemRow}
                                className="text-xs"
                            >
                                <PlusIcon className="w-3 h-3 mr-1" /> Add Another Item
                            </Button>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? "Creating..." : "Create Page"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Existing Pages */}
            <h2 className="text-sm font-semibold mb-3">Existing Pages</h2>
            {pages.length === 0 ? (
                <p className="text-sm text-gray-500">No pages created yet.</p>
            ) : (
                <div className="space-y-4">
                    {pages.map((page) => (
                        <Card key={page.id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <FileTextIcon className="w-4 h-4 text-purple-600" />
                                        {page.name}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setAddingToPage(
                                                    addingToPage === page.id ? null : page.id,
                                                )
                                            }
                                            className="text-xs"
                                        >
                                            <PlusIcon className="w-3 h-3 mr-1" /> Add Item
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeletePage(page.id)}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            <TrashIcon className="w-3 h-3 mr-1" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Add item form */}
                                {addingToPage === page.id && (
                                    <div className="flex flex-col sm:flex-row gap-2 p-3 mb-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                                        <Input
                                            value={newItem.name}
                                            onChange={(e) =>
                                                setNewItem({ ...newItem, name: e.target.value })
                                            }
                                            placeholder="Item name *"
                                            className="flex-1"
                                        />
                                        <Input
                                            value={newItem.url}
                                            onChange={(e) =>
                                                setNewItem({ ...newItem, url: e.target.value })
                                            }
                                            placeholder="URL (optional)"
                                            className="flex-1"
                                        />
                                        <div className="flex gap-2 items-center">
                                            <label className="cursor-pointer flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1.5">
                                                <UploadIcon className="w-3 h-3" />
                                                {newItem.file
                                                    ? newItem.file.name.slice(0, 15) + "..."
                                                    : "Upload"}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        setNewItem({
                                                            ...newItem,
                                                            file: e.target.files?.[0] || null,
                                                        })
                                                    }
                                                />
                                            </label>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAddItem(page.id)}
                                                disabled={isAddingItem}
                                                className="text-xs"
                                            >
                                                {isAddingItem ? "Adding..." : "Add"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Existing items */}
                                {page.items.length === 0 ? (
                                    <p className="text-xs text-gray-500">No items yet.</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {page.items.map((item) => (
                                            <li
                                                key={item.id}
                                                className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-gray-900 dark:text-gray-100 truncate">
                                                        {item.name}
                                                    </span>
                                                    {item.url && (
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline text-xs shrink-0"
                                                        >
                                                            [link]
                                                        </a>
                                                    )}
                                                    {item.fileUrl && (
                                                        <a
                                                            href={item.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-green-600 hover:underline text-xs shrink-0"
                                                        >
                                                            [file]
                                                        </a>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="text-red-400 hover:text-red-600 h-6 w-6 shrink-0"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
