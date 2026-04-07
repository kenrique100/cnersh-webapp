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

interface OTPEmailProps {
    otpCode: string;
    userName?: string;
    expiresInMinutes?: number;
    appName?: string;
}

export const OTPEmail = ({
                             otpCode,
                             userName,
                             expiresInMinutes = 10,
                             appName = "National Ethics Committee for Health Research on Humans",
                         }: OTPEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-sans">
                <Preview>Your verification code for {appName}</Preview>
                <Container className="mx-auto py-5 pb-12 px-4 max-w-150">
                    {/* Professional Email Navbar */}
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
                        {userName ? `Hi ${userName},` : 'Hello,'}
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        You requested a one-time password (OTP) to sign in to your {appName} account.
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700 font-semibold">
                        Your verification code is:
                    </Text>

                    {/* OTP Code Display */}
                    <Section className="text-center my-8">
                        <div style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                            padding: '20px 40px',
                            borderRadius: '12px',
                            border: '2px solid #5F51E8'
                        }}>
                            <Text className="text-[42px] font-bold text-gray-900 m-0 tracking-[0.25em] font-mono">
                                {otpCode}
                            </Text>
                        </div>
                    </Section>

                    <Text className="text-[14px] text-gray-600 text-center">
                        Enter this code in the sign-in page to access your account.
                    </Text>

                    <Hr className="border border-solid border-gray-200 my-6" />

                    {/* Security Notice */}
                    <Section className="bg-amber-50 rounded-md p-4 my-6 border border-amber-100">
                        <Text className="text-[13px] text-gray-700 m-0 mb-2 font-semibold">
                            ⚠️ Important Security Information:
                        </Text>
                        <Text className="text-[13px] text-gray-600 m-0 mb-1">
                            • This code will expire in <strong>{expiresInMinutes} minutes</strong>
                        </Text>
                        <Text className="text-[13px] text-gray-600 m-0 mb-1">
                            • Do not share this code with anyone
                        </Text>
                        <Text className="text-[13px] text-gray-600 m-0 mb-1">
                            • {appName} will never ask for this code via phone or email
                        </Text>
                        <Text className="text-[13px] text-gray-600 m-0">
                            • If you didn't request this code, please ignore this email
                        </Text>
                    </Section>

                    <Text className="text-[#8898aa] text-[12px] text-center">
                        This verification code will expire in {expiresInMinutes} minutes.
                    </Text>

                    <Text className="text-[#8898aa] text-[12px] text-center mt-2">
                        If you did not request this code, someone may be trying to access your account.
                        Please secure your account immediately.
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

export default OTPEmail;
