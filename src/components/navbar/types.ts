import type { ElementType } from "react";

export interface NavbarPageItem {
    id: string;
    name: string;
    url: string | null;
    fileUrl: string | null;
}

export interface NavbarPage {
    id: string;
    name: string;
    items: NavbarPageItem[];
    children?: NavbarPage[];
}

export interface NavbarProps {
    user?: {
        name: string | null;
        email: string;
        image: string | null;
        role?: string | null;
    } | null;
    notificationCount?: number;
    pages?: NavbarPage[];
}

export interface NavItem {
    href: string;
    label: string;
    icon: ElementType;
}

declare global {
    interface Window {
        google?: {
            translate: {
                TranslateElement: {
                    new (
                        options: { pageLanguage: string; includedLanguages?: string; layout: number; autoDisplay: boolean },
                        elementId: string
                    ): unknown;
                    InlineLayout: {
                        SIMPLE: number;
                    };
                };
            };
        };
        googleTranslateElementInit?: () => void;
    }
}
