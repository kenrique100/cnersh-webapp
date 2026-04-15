export const isLikelyIpv4Address = (hostname: string) =>
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(hostname);

export const getCookieDomain = (hostname: string) => {
    if (!hostname || hostname === "localhost" || isLikelyIpv4Address(hostname) || !hostname.includes(".")) {
        return null;
    }
    return hostname;
};
