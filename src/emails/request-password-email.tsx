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

interface RequestPasswordEmailProps {
    url: string;
    to: string;
    appName?: string;
}

export const RequestPasswordEmail = ({
                                         url,
                                         to,
                                         appName = "Cameroon National Ethics Community",
                                     }: RequestPasswordEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-sans">
                <Preview>Reset your password for {appName}</Preview>
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
                        Hello,
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        We received a request to reset the password for your {appName} account
                        associated with <strong>{to}</strong>.
                    </Text>

                    <Text className="text-[16px] leading-6.5 text-gray-700">
                        Click the button below to reset your password. This link will expire in 1 hour for security reasons.
                    </Text>

                    <Section className="text-center my-8">
                        <Button
                            className="bg-[#5F51E8] rounded-md text-white text-[16px] font-medium no-underline text-center px-6 py-3"
                            href={url}
                        >
                            Reset Your Password
                        </Button>
                    </Section>

                    <Text className="text-gray-500 text-[14px] mt-6">
                        Or copy and paste this link into your browser:
                    </Text>

                    <Text className="text-[#5F51E8] text-[14px] break-all">
                        {url}
                    </Text>

                    <Hr className="border border-solid border-gray-200 my-6" />

                    {/* Security Notice */}
                    <Section className="bg-gray-50 rounded-md p-4 my-6">
                        <Text className="text-[13px] text-gray-700 m-0 mb-2 font-semibold">
                            Security Notice:
                        </Text>
                        <Text className="text-[13px] text-gray-600 m-0">
                            If you did not request a password reset, please ignore this email or contact support
                            if you have concerns about your account security. Your password will not be changed
                            unless you click the button above and create a new one.
                        </Text>
                    </Section>

                    <Text className="text-[#8898aa] text-[12px] text-center">
                        This password reset link will expire in 1 hour.
                    </Text>

                    <Text className="text-[#8898aa] text-[12px] text-center mt-2">
                        © {new Date().getFullYear()} {appName}. All rights reserved.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default RequestPasswordEmail;