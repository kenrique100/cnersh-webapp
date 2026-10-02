import React from "react";
import { render } from "@testing-library/react";

import UserStorageGuard from "@/components/user-storage-guard";

describe("<UserStorageGuard />", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("cnersh_lang", "en");
        localStorage.setItem("cnersh:feed:user-a:share-counts", "{}");
        localStorage.setItem("cnersh-protocol-draft:user-a", "{}");
        localStorage.setItem("cnersh:feed:user-b:share-counts", "{}");
        localStorage.setItem("feed-share-counts", "{}");
    });

    it("renders nothing", () => {
        const { container } = render(<UserStorageGuard userId="user-b" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("purges other users' data and legacy keys, keeping the signed-in user's and preferences", () => {
        render(<UserStorageGuard userId="user-b" />);

        expect(localStorage.getItem("cnersh:feed:user-a:share-counts")).toBeNull();
        expect(localStorage.getItem("cnersh-protocol-draft:user-a")).toBeNull();
        expect(localStorage.getItem("feed-share-counts")).toBeNull();
        expect(localStorage.getItem("cnersh:feed:user-b:share-counts")).toBe("{}");
        expect(localStorage.getItem("cnersh_lang")).toBe("en");
    });
});