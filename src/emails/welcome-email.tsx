import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
    Hr,
} from "@react-email/components";

interface WelcomeEmailProps {
    userName: string;
    appName?: string;
}

export const WelcomeEmail = ({
                                 userName,
                                 appName = "National Ethics Committee for Health Research on Humans",
                             }: WelcomeEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-sans">
                <Preview>Welcome to {appName}!</Preview>
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
                        Welcome to {appName}! We are thrilled to have you as a member of our community.
                        Your account has been successfully verified and is now active.
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        With your account, you can:
                    </Text>
                    <ul className="list-disc pl-6 text-[16px] leading-6.5 text-gray-700">
                        <li>Submit research protocols for ethical review</li>
                        <li>Track the status of your submissions</li>
                        <li>Receive important notifications and updates</li>
                        <li>Collaborate with fellow researchers</li>
                    </ul>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        If you have any questions or need assistance, please don&#39;t hesitate to contact our support team.
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-800">
                        Best regards,<br />
                        The {appName} Team
                    </Text>

                    <Hr className="border border-solid border-gray-200 my-6" />

                    <Text className="text-[#8898aa] text-[12px] text-center">
                        © {new Date().getFullYear()} {appName}. All rights reserved.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default WelcomeEmail;