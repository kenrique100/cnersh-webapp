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

interface VerificationEmailProps {
    verificationUrl: string;
    userName: string;
    appName?: string;
}

export const VerificationEmail = ({
                                      verificationUrl,
                                      userName,
                                      appName = "Cameroon National Ethics Community",
                                  }: VerificationEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-sans">
                <Preview>Verify your email for {appName}</Preview>
                <Container className="mx-auto py-5 pb-12 px-4 max-w-150">
                    {/* Professional Email Navbar - Text Based */}
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
                        Welcome to {appName}. Thank you for signing up.
                        Please confirm your email address by clicking the button below.
                    </Text>

                    <Section className="text-center my-8">
                        <Button
                            className="bg-[#5F51E8] rounded-md text-white text-[16px] font-medium no-underline text-center px-6 py-3"
                            href={verificationUrl}
                        >
                            Verify Email Address
                        </Button>
                    </Section>

                    <Text className="text-gray-500 text-[14px] mt-6">
                        Or copy and paste this link into your browser:
                    </Text>

                    <Text className="text-[#5F51E8] text-[14px] break-all">
                        {verificationUrl}
                    </Text>

                    <Hr className="border border-solid border-gray-200 my-6" />

                    <Text className="text-[#8898aa] text-[12px] text-center">
                        If you did not create an account with {appName},
                        you can safely ignore this email.
                    </Text>

                    <Text className="text-[#8898aa] text-[12px] text-center mt-2">
                        © {new Date().getFullYear()} {appName}. All rights reserved.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default VerificationEmail;