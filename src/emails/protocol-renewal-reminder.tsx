import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

export interface ProtocolRenewalReminderProps {
    ownerName: string;
    protocolTitle: string;
    expiresAt: Date;
    resubmitUrl: string;
}

export default function ProtocolRenewalReminder({
                                                    ownerName,
                                                    protocolTitle,
                                                    expiresAt,
                                                    resubmitUrl,
                                                }: ProtocolRenewalReminderProps) {
    const expiresLabel = expiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <Html>
            <Head />
            <Preview>
                {`Action required: your protocol "${protocolTitle}" expires on ${expiresLabel}.`}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={heading}>Protocol Renewal Reminder</Heading>

                    <Text style={paragraph}>Dear {ownerName},</Text>

                    <Text style={paragraph}>
                        Your ethics protocol <strong>&ldquo;{protocolTitle}&rdquo;</strong> is due
                        to expire on <strong>{expiresLabel}</strong>. To keep it active, you must{" "}
                        <strong>update and resubmit</strong> it for review before the expiry date.
                    </Text>

                    <Section style={warning}>
                        <Text style={warningText}>
                            If you do not resubmit before {expiresLabel}, your protocol will be
                            automatically marked as <strong>EXPIRED</strong> and will require
                            renewal before it can be used.
                        </Text>
                    </Section>

                    <Section style={ctaContainer}>
                        <Button style={button} href={resubmitUrl}>
                            Renew Protocol
                        </Button>
                    </Section>

                    <Text style={paragraph}>
                        Once resubmitted, your protocol will go through the standard review
                        process. Upon approval, a new 12-month validity period will begin.
                    </Text>

                    <Hr style={hr} />

                    <Text style={footer}>
                        CNERSH &mdash; Commité National d&apos;Éthique de la Recherche pour la
                        Santé Humaine
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main: React.CSSProperties = {
    backgroundColor: "#f4f4f7",
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: "24px 0",
};

const container: React.CSSProperties = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "32px",
    maxWidth: "560px",
    borderRadius: "8px",
};

const heading: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
    fontSize: "14px",
    lineHeight: "22px",
    color: "#374151",
    margin: "0 0 16px",
};

const warning: React.CSSProperties = {
    backgroundColor: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: "6px",
    padding: "12px 16px",
    margin: "0 0 24px",
};

const warningText: React.CSSProperties = {
    fontSize: "13px",
    lineHeight: "20px",
    color: "#92400e",
    margin: 0,
};

const ctaContainer: React.CSSProperties = {
    textAlign: "center",
    margin: "24px 0",
};

const button: React.CSSProperties = {
    backgroundColor: "#7c3aed",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    padding: "12px 24px",
    borderRadius: "6px",
    display: "inline-block",
};

const hr: React.CSSProperties = {
    borderColor: "#e5e7eb",
    margin: "24px 0",
};

const footer: React.CSSProperties = {
    fontSize: "12px",
    color: "#9ca3af",
    textAlign: "center",
    margin: 0,
};