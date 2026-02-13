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

interface OtpEmailProps {
    otp: string;
    appName?: string;
}

export const OtpEmail = ({ 
    otp,
    appName = "Cameroon National Ethics Community"
}: OtpEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-sans">
                <Preview>Your verification code for {appName}</Preview>
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
                        Hello,
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        You are receiving this email because you requested a verification code to sign in to your {appName} account.
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700 mb-4">
                        Here is your verification code:
                    </Text>

                    {/* Large OTP Code Display */}
                    <Section className="text-center my-8">
                        <table className="w-full">
                            <tbody>
                            <tr>
                                <td className="text-center">
                                    <div style={{ 
                                        display: 'inline-block', 
                                        background: '#F3F4F6', 
                                        padding: '20px 40px', 
                                        borderRadius: '12px',
                                        border: '2px solid #E5E7EB'
                                    }}>
                                        <Text className="text-[48px] font-bold text-gray-900 m-0 tracking-[0.25em] font-mono">
                                            {otp}
                                        </Text>
                                    </div>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </Section>

                    <Text className="text-[14px] text-center text-gray-600 mb-6">
                        This code will expire in <strong>10 minutes</strong>
                    </Text>

                    <Hr className="border border-solid border-gray-200 my-6" />

                    {/* Security Warning */}
                    <Section className="bg-amber-50 rounded-md p-4 my-6" style={{ backgroundColor: '#FFFBEB' }}>
                        <Text className="text-[13px] text-amber-800 m-0 mb-2 font-semibold">
                            ⚠️ Security Warning:
                        </Text>
                        <Text className="text-[13px] text-amber-700 m-0">
                            Never share this code with anyone. {appName} will never ask you for this code.
                            If you did not request this code, please ignore this email or contact support immediately.
                        </Text>
                    </Section>

                    <Text className="text-[#8898aa] text-[12px] text-center">
                        If you did not request this verification code, you can safely ignore this email.
                    </Text>

                    <Text className="text-[#8898aa] text-[12px] text-center mt-2">
                        © {new Date().getFullYear()} {appName}. All rights reserved.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default OtpEmail;