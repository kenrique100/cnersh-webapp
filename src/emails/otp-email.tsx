import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Tailwind,
    Text,
} from "@react-email/components";

interface OtpEmailProps {
    otp: string;
}

export const OtpEmail = ({ otp }: OtpEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-Betterauth-next">
                <Preview>Your login code for cnec</Preview>
                <Container className="mx-auto py-5 pb-12">
                    <Text className="text-[16px] leading-6.5">
                        Please find your code to login below
                    </Text>

                    <Text className="text-[40px] leading-5">{otp}</Text>

                    <Text className="text-[#8898aa] text-[12px]">
                        If you did not request a code, you can safely ignore this email.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default OtpEmail;