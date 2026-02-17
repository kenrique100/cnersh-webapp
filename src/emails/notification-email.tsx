import {
    Body,
    Button,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
    Hr,
} from "@react-email/components";

interface NotificationEmailProps {
    userName: string;
    notificationMessage: string;
    notificationType: string;
    actionUrl?: string;
    appName?: string;
}

export const NotificationEmail = ({
    userName,
    notificationMessage,
    notificationType,
    actionUrl,
    appName = "National Ethics Committee for Health Research on Humans",
}: NotificationEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-sans">
                <Preview>{notificationMessage}</Preview>
                <Container className="mx-auto py-5 pb-12 px-4 max-w-150">
                    <Section className="mb-6">
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="pb-4">
                                        <table className="w-full">
                                            <tbody>
                                                <tr>
                                                    <td className="text-center">
                                                        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #5F51E8 0%, #7C6CF0 100%)', padding: '12px 24px', borderRadius: '8px' }}>
                                                            <Text className="text-[22px] font-bold text-white m-0 tracking-wide">
                                                                {appName}
                                                            </Text>
                                                        </div>
                                                        <Text className="text-[14px] text-gray-500 mt-2 m-0">
                                                            Ethics • Integrity • Community
                                                        </Text>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    <Hr className="border border-solid border-gray-200 my-6" />

                    <Text className="text-[16px] leading-6.5 text-gray-800">
                        Hi {userName},
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        You have a new <strong>{notificationType.toLowerCase().replace("_", " ")}</strong> notification:
                    </Text>

                    <Section className="my-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Text className="text-[15px] text-gray-800 m-0">
                            {notificationMessage}
                        </Text>
                    </Section>

                    {actionUrl && (
                        <Section className="text-center my-8">
                            <Button
                                className="bg-[#5F51E8] rounded-md text-white text-[16px] font-medium no-underline text-center px-6 py-3"
                                href={actionUrl}
                            >
                                View Details
                            </Button>
                        </Section>
                    )}

                    <Hr className="border border-solid border-gray-200 my-6" />

                    <Text className="text-[#8898aa] text-[12px] text-center">
                        This is an automated notification from {appName}.
                    </Text>

                    <Text className="text-[#8898aa] text-[12px] text-center mt-2">
                        © {new Date().getFullYear()} {appName}. All rights reserved.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default NotificationEmail;
