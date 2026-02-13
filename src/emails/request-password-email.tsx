import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";

interface RequestPasswordEmailProps {
    url: string;
    to: string;
}

export const RequestPasswordEmail = ({
                                         url,
                                         to,
                                     }: RequestPasswordEmailProps) => (
    <Html>
        <Head />
        <Tailwind>
            <Body className="bg-white font-Betterauth-next">
                <Preview>Reset your password for cnec</Preview>
                <Container className="mx-auto py-5 pb-12">
                    <Heading
                        as="h1"
                        className="mb-3 text-center text-[20px] font-semibold text-black"
                    >
                        Hello
                    </Heading>
                    <Text className="text-[16px] leading-6.5">
                        We received a request to reset the password for CNEC
                        account associated with {to}
                    </Text>
                    <Section className="text-center">
                        <Button
                            className="bg-[#5F51E8] rounded-[3px] text-white text-[16px] no-underline text-center block p-3"
                            href={url}
                        >
                            Reset your password
                        </Button>
                    </Section>

                    <Text className="text-[#8898aa] text-[12px]">
                        If you did not request for password reset, you can safely ignore
                        this email.
                    </Text>
                </Container>
            </Body>
        </Tailwind>
    </Html>
);

export default RequestPasswordEmail;