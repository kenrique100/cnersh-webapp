import { revalidateTag as nextRevalidateTag } from "next/cache";

export function revalidateTag(tag: string, profile: string = "max"): void {
    (nextRevalidateTag as unknown as (t: string, p: string) => void)(tag, profile);
}