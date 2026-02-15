"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User, Users, Check, X, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SignUpData {
    name: string;
    email: string;
    password: string;
    gender: string;
}

// Email validation schema
const emailSchema = z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address");

// Password validation schema
const passwordSchema = z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const formSchema = z
    .object({
        name: z
            .string()
            .min(1, "Full name is required")
            .min(3, "Name must be at least 3 characters"),
        email: emailSchema,
        gender: z.enum(["male", "female"], {
            message: "Please select a gender",
        }),
        password: passwordSchema,
        confirmPassword: z
            .string()
            .min(1, "Please confirm your password"),
        termsAccepted: z.boolean().refine((val) => val === true, {
            message: "You must accept the Terms and Conditions to sign up",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type PasswordRequirement = {
    label: string;
    met: boolean;
};

type FormValues = z.infer<typeof formSchema>;

export function SignUpForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [termsDialogOpen, setTermsDialogOpen] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            gender: "male",
            password: "",
            confirmPassword: "",
            termsAccepted: false,
        },
        mode: "onChange",
    });

    const watchPassword = form.watch("password");

    useEffect(() => {
        setPassword(watchPassword || "");
        if (watchPassword) {
            calculatePasswordStrength(watchPassword);
        }
    }, [watchPassword]);

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 10;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 15;
        setPasswordStrength(Math.min(strength, 100));
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength < 40) return "bg-red-600";
        if (passwordStrength < 70) return "bg-yellow-600";
        return "bg-green-600";
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength < 40) return "Weak";
        if (passwordStrength < 70) return "Medium";
        return "Strong";
    };

    const passwordRequirements: PasswordRequirement[] = [
        { label: "At least 8 characters", met: password.length >= 8 },
        { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
        { label: "Lowercase letter (a-z)", met: /[a-z]/.test(password) },
        { label: "Number (0-9)", met: /[0-9]/.test(password) },
        { label: "Special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
    ];

    const onSubmit = async (data: FormValues) => {
        try {
            await authClient.signUp.email(
                {
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    gender: data.gender,
                } as SignUpData,
                {
                    onSuccess: async () => {
                        toast.success("Account created successfully");
                        form.reset({
                            name: "",
                            email: "",
                            gender: "male",
                            password: "",
                            confirmPassword: "",
                            termsAccepted: false,
                        });
                        setPassword("");
                        router.push("/");
                    },
                    onError: (ctx) => {
                        console.error("Signup error:", ctx.error);
                        toast.error(ctx.error.message || "Failed to create account");
                    },
                }
            );
        } catch (error) {
            console.error("Signup error:", error);
            toast.error("Unable to create account. Please try again later.");
        }
    };

    const signInWithGoogle = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/",
            });
        } catch {
            toast.error("Unable to sign in with Google. Please try again.");
        }
    };

    return (
        <Card className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg rounded-2xl">
            <CardHeader className="space-y-6 px-6 sm:px-8 pt-10 pb-6">
                <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-center w-full h-full">
                            <Image
                                src="/logo.png"
                                alt="Government Services"
                                width={48}
                                height={48}
                                className="w-12 h-12"
                                priority
                            />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Create Account
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Register for Cameroon National Ethics Community (CNEC)
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-4">
                <form
                    id="signup-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                >
                    <FieldGroup className="space-y-2">
                        {/* Name Field */}
                        <Field data-invalid={!!form.formState.errors.name} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                Full Name <span className="text-red-500">*</span>
                            </FieldLabel>
                            <Input
                                {...form.register("name")}
                                placeholder="John Doe"
                                autoComplete="name"
                                aria-invalid={!!form.formState.errors.name}
                                className="h-11 text-sm px-4 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                            />
                            {form.formState.errors.name && (
                                <FieldError
                                    errors={[form.formState.errors.name]}
                                    className="text-xs text-red-600 dark:text-red-400 mt-1"
                                />
                            )}
                        </Field>

                        {/* Email Field */}
                        <Field data-invalid={!!form.formState.errors.email} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                Email Address <span className="text-red-500">*</span>
                            </FieldLabel>
                            <Input
                                {...form.register("email")}
                                type="email"
                                placeholder="name@agency.gov.cm"
                                autoComplete="email"
                                aria-invalid={!!form.formState.errors.email}
                                className="h-11 text-sm px-4 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                            />
                            {form.formState.errors.email && (
                                <FieldError
                                    errors={[form.formState.errors.email]}
                                    className="text-xs text-red-600 dark:text-red-400 mt-1"
                                />
                            )}
                        </Field>

                        {/* Gender RadioGroup */}
                        <Field data-invalid={!!form.formState.errors.gender} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                Gender <span className="text-red-500">*</span>
                            </FieldLabel>
                            <RadioGroup
                                onValueChange={(value) => form.setValue("gender", value as "male" | "female")}
                                value={form.watch("gender")}
                                className="flex flex-wrap gap-4 mt-1"
                                defaultValue="male"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="male" id="male" className="border-gray-400 text-blue-600" />
                                    <label
                                        htmlFor="male"
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                                    >
                                        Male
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="female" id="female" className="border-gray-400 text-blue-600" />
                                    <label
                                        htmlFor="female"
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                                    >
                                        Female
                                    </label>
                                </div>
                            </RadioGroup>
                            {form.formState.errors.gender && (
                                <FieldError
                                    errors={[form.formState.errors.gender]}
                                    className="text-xs text-red-600 dark:text-red-400 mt-1"
                                />
                            )}
                        </Field>

                        {/* Password Field */}
                        <Field data-invalid={!!form.formState.errors.password} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-gray-500" />
                                Password <span className="text-red-500">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    {...form.register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    autoComplete="new-password"
                                    aria-invalid={!!form.formState.errors.password}
                                    className="h-11 text-sm px-4 pr-12 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ?
                                        <EyeOff className="w-4 h-4" /> :
                                        <Eye className="w-4 h-4" />
                                    }
                                </button>
                            </div>

                            {password && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-800">
                                            <div
                                                className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                                                style={{ width: `${passwordStrength}%` }}
                                            />
                                        </div>
                                        <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {getPasswordStrengthText()}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Password must contain:</p>
                                        {passwordRequirements.map((req, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs">
                                                {req.met ? (
                                                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                                ) : (
                                                    <X className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                                )}
                                                <span className={req.met ? "text-green-700 dark:text-green-500" : "text-gray-600 dark:text-gray-400"}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {form.formState.errors.password && (
                                <FieldError
                                    errors={[form.formState.errors.password]}
                                    className="text-xs text-red-600 dark:text-red-400 mt-1"
                                />
                            )}
                        </Field>

                        {/* Confirm Password Field */}
                        <Field data-invalid={!!form.formState.errors.confirmPassword} className="gap-1.5">
                            <FieldLabel className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-gray-500" />
                                Confirm Password <span className="text-red-500">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    {...form.register("confirmPassword")}
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
                                    autoComplete="new-password"
                                    aria-invalid={!!form.formState.errors.confirmPassword}
                                    className="h-11 text-sm px-4 pr-12 rounded-md border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ?
                                        <EyeOff className="w-4 h-4" /> :
                                        <Eye className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                            {form.formState.errors.confirmPassword && (
                                <FieldError
                                    errors={[form.formState.errors.confirmPassword]}
                                    className="text-xs text-red-600 dark:text-red-400 mt-1"
                                />
                            )}
                            {form.watch("confirmPassword") &&
                                form.watch("password") &&
                                form.watch("confirmPassword") !== form.watch("password") && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        Passwords do not match
                                    </p>
                                )}
                        </Field>

                        {/* Terms and Conditions Checkbox */}
                        <Field data-invalid={!!form.formState.errors.termsAccepted} className="gap-1.5 mt-4">
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="termsAccepted"
                                    checked={form.watch("termsAccepted")}
                                    onCheckedChange={(checked) =>
                                        form.setValue("termsAccepted", checked as boolean, { shouldValidate: true })
                                    }
                                    className="mt-0.5 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="termsAccepted"
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight cursor-pointer"
                                    >
                                        I have read and agree to the{" "}
                                        {/* Terms and Conditions Dialog */}
                                        <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
                                            <DialogTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 font-semibold underline-offset-2 hover:underline focus:outline-none"
                                                >
                                                    Terms and Conditions
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl w-full h-[80vh] bg-white dark:bg-gray-950 p-0 gap-0 flex flex-col">
                                                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                                                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                                                        <FileText className="w-5 h-5 text-blue-600" />
                                                        CNEC Terms and Conditions
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Cameroon National Ethics Committee (CNEC) - Research Ethics Framework
                                                    </DialogDescription>
                                                </DialogHeader>
                                                {/* ScrollArea - ONLY the terms content, no button */}
                                                <ScrollArea className="flex-1 min-h-0 px-6 bg-white dark:bg-gray-950">
                                                    <div className="space-y-6 text-sm py-4">
                                                        {/* Foreword Section */}
                                                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                                                FOREWORD
                                                            </h3>
                                                            <p className="text-gray-700 dark:text-gray-300 italic">
                                                                The respect of ethical values is an important aspect of the day-to-day obligations of any public officer.
                                                                Such values are indispensable in ensuring moral and professional standards in the Public Service, which
                                                                inevitably leads to greater integrity in staff conduct.
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300 mt-2 text-xs">
                                                                - Rev. Dr. Dieudonné MASS GAMS, Chairman
                                                            </p>
                                                        </div>

                                                        {/* Preamble */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                                                PREAMBLE
                                                            </h3>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                We, the employees of the National Anti-Corruption Commission, individually and collectively,
                                                                acknowledging that the Constitution of Cameroon guarantees all persons the right to enjoy the freedom
                                                                of conscience and religion, and that moral values are the foundation of ethical principles;
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                Acknowledging further that Cameroon&#39;s traditional philosophies, religions and cultures recognize and
                                                                uphold equity as a basic ethical principle;
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                Believing that equity embodies the highest level of human dignity, integrity, honesty, respect and
                                                                responsibility, all essential for development and security;
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                Considering that corruption undermines development, contributes to poverty and threatens the stability
                                                                of the Nation;
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                Reaffirming the mission of the National Anti-Corruption Commission to fight corruption, as well as
                                                                promote ethical governance and human development;
                                                            </p>
                                                            <p className="text-gray-700 dark:text-gray-300 mt-2 font-medium">
                                                                Accept and abide by the values, principles and obligations of this Code of Ethics.
                                                            </p>
                                                        </div>

                                                        {/* Official Languages */}
                                                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                                                            <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">OFFICIAL LANGUAGES</h3>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                The committee operates in both English and French. All documentation may be submitted in either official language.
                                                                Bilingual submissions are encouraged for efficient processing.
                                                            </p>
                                                        </div>

                                                        {/* PART ONE: INTERPRETATION OF KEY TERMS */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base border-b border-gray-200 dark:border-gray-800 pb-2">
                                                                PART ONE: INTERPRETATION OF KEY TERMS
                                                            </h3>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">1.1. DEFINITIONS</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Bribe:</span> Money or other valuables given, received, promised or solicited in order to either induce or reward a person to influence conduct.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Commission (CONAC):</span> The National Anti-Corruption Commission of Cameroon created by Decree N°2006/008 of 11 March, 2006.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Conflict of Interest:</span> Whenever an individual&#39;s private interest clashes and is proven to be at odds or competes with the interest of the public or the Commission.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Corruption:</span> Soliciting, accepting, obtaining, receiving, promising or offering an undue advantage or other personal temptation or inducement.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Declaration of Interest:</span> Disclosing any officer&#39;s private interest that may conflict with the interest of the Commission.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Employee of the Commission:</span> Any temporary, contract or permanent person and entity exercising the powers of the Anti-Corruption Commission.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Family:</span> The spouse, son, daughter and any other close relative.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Gift:</span> Any conventional hospitality or unsolicited present offered to a staff or the Commission in recognition or appreciation of their services, or as a gesture of goodwill or any seasonal offer.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Hospitality:</span> Unsolicited courtesies of meals, refreshments and entertainment.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Humaneness:</span> The quality of human goodness that embodies the values of societal virtues.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Illegal activity:</span> Any act carried out which, under any written law in force, amounts to an offence.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Inappropriate behaviour:</span> Any action or conduct which undermines the work, environment, image and integrity of the Commission.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Internal rules and regulations:</span> The Internal Rules and Regulations of CONAC, validated on 03 November, 2009.
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                                                                        <span className="font-medium">Probity:</span> The quality of being completely honest.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Mission and Objectives */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1.2. MISSION STATEMENT</h3>
                                                            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-md border-l-4 border-blue-600">
                                                                &#34;To promote integrity, transparency and accountability for the attainment of zero tolerance for corruption in Cameroon.&#34;
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1.3. GENERAL OBJECTIVE</h3>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                Setting out the ethical values and principles that we should uphold individually and collectively as employees of the National Anti-Corruption Commission.
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1.4. SPECIFIC OBJECTIVES</h3>
                                                            <p className="text-gray-700 dark:text-gray-300">This Code of Ethics aims at:</p>
                                                            <ol className="list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300 mt-1">
                                                                <li>Recognizing that service in the Commission is a public trust;</li>
                                                                <li>Maintaining public confidence and trust in the integrity of the Commission staff both at the individual and collective levels;</li>
                                                                <li>Upholding the respect and confidence that society places in the National Anti-Corruption Commission as an institution;</li>
                                                                <li>Assuring the public that all CONAC Staff are expected to respect standards that place public interest above personal and private interests;</li>
                                                                <li>Providing a transparent system by which the public may judge the integrity of the Commission and her staff;</li>
                                                                <li>Providing greater certainty and guidance for CONAC staff to reconcile their private interests with their public duties;</li>
                                                                <li>Fostering consensus among staff on issues relating to proper conduct reflected through individual self-regulation and open collegial relationship; and</li>
                                                                <li>Reaffirming the people&#39;s faith in the integrity of the Commission.</li>
                                                            </ol>
                                                        </div>

                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1.5. VISION</h3>
                                                            <p className="text-gray-700 dark:text-gray-300">
                                                                This Code of Ethics provides members of staff a clear and concise guide to values they must uphold and protect in order to ensure a fair, open and transparent work for a quality output and public confidence. To achieve this, we shall:
                                                            </p>
                                                            <ol className="list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300 mt-1">
                                                                <li>Develop an ethical organization of the highest integrity;</li>
                                                                <li>Promote honesty, just management, fairness, and a healthy working environment;</li>
                                                                <li>Respect the dignity due to everyone;</li>
                                                                <li>Ensure efficiency and fairness in public service delivery;</li>
                                                                <li>Promote good and responsible citizenship;</li>
                                                                <li>Work as a united and harmonious team;</li>
                                                                <li>Work with other organizations to promote ethical governance, sustainable development and zero tolerance to corruption.</li>
                                                            </ol>
                                                        </div>

                                                        {/* PART TWO: CORE ETHICAL VALUES */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base border-b border-gray-200 dark:border-gray-800 pb-2">
                                                                PART TWO: CORE ETHICAL VALUES
                                                            </h3>

                                                            {/* 2.1 Integrity */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.1. INTEGRITY</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Being honest, having strong moral principles and standing consistently for what is right.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Irreproachable conduct;</li>
                                                                    <li>No conflict of interest;</li>
                                                                    <li>Resistance to pressures that might influence performance;</li>
                                                                    <li>No acceptance of gifts or favours of any form while on duty;</li>
                                                                    <li>No abuse of power; and</li>
                                                                    <li>Prioritizing public interest over personal interest.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We commit to be people of integrity.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Honesty, Trust, Fairness, Loyalty and Confidentiality.</p>
                                                            </div>

                                                            {/* 2.2 Excellence */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.2. EXCELLENCE</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Striving to be as good as one can, that is, being diligent, committed, well informed and well prepared to do a job properly and honestly.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Properly planned and diligently executed work;</li>
                                                                    <li>Tasks thoroughly and competently carried out on a &#34;first-in-first-out&#34; basis, except otherwise instructed by the hierarchy;</li>
                                                                    <li>High performance standards upheld;</li>
                                                                    <li>Willingness to develop capacities, motivate and be exemplary; and</li>
                                                                    <li>Knowledge and experience sharing.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We commit to pursue excellence.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Honesty, Selflessness, Collaboration, Accountability, Impartiality, Responsibility and Integrity.</p>
                                                            </div>

                                                            {/* 2.3 Accountability */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.3. ACCOUNTABILITY</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Accepting and reporting on one&#39;s decisions, actions and outcomes.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Transparency and efficiency in the discharge of duties;</li>
                                                                    <li>Safeguarding and accounting for all Commission and State assets and resources put at your disposal;</li>
                                                                    <li>Proper record keeping; and</li>
                                                                    <li>Being ready, at all times, to explain the basis of decisions made and accepting their consequences.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We commit to be accountable.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Responsibility, Excellence, Loyalty, Responsible Citizenship, Integrity.</p>
                                                            </div>

                                                            {/* 2.4 Respect */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.4. RESPECT</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Being courteous and decent in word and action, recognizing and accepting our differences, as well as acknowledging each other&#39;s rights to dignity and privacy.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Courteous and fair treatment of others, irrespective of their position, language or status;</li>
                                                                    <li>Proper attention to users of CONAC services;</li>
                                                                    <li>Recognition and appreciation of the uniqueness of each employee;</li>
                                                                    <li>Dignified and decent treatment of colleagues and users;</li>
                                                                    <li>Courteous, honest and fair treatment of users, with due regard for their rights, entitlements, duties and obligations; and</li>
                                                                    <li>Enhancing co-operation, harmony and unity in our communities.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We shall always be respectful in the performance of our duties.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Honesty, Fairness, Loyalty, Confidentiality, and Integrity.</p>
                                                            </div>

                                                            {/* 2.5 Confidentiality */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.5. CONFIDENTIALITY</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Discretion in handling official information and limiting disclosures only to a formal need-to-know basis.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Adhering to the principle of confidentiality at all times;</li>
                                                                    <li>Restricting access to confidential information;</li>
                                                                    <li>Ensuring that confidential information is only released to authorized persons; and</li>
                                                                    <li>Releasing confidential information only upon proper authorization, preferably written.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We shall observe confidentiality at all times.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Trust, Integrity, Loyalty, Accountability, Responsibility and Discretion.</p>
                                                            </div>

                                                            {/* 2.6 Collaboration */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.6. COLLABORATION</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Working together as a team to achieve set goals.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Communicating effectively at all times; and</li>
                                                                    <li>Encouraging internal and external goal-driven consultation.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We shall collaborate in all our endeavours.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Respect, Trust, Fairness, Responsibility and Integrity.</p>
                                                            </div>

                                                            {/* 2.7 Impartiality */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.7. IMPARTIALITY</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Being just, unbiased and avoiding prejudices in decision-making.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Striving to be objective, calm and unemotional. Being fully informed and having all relevant information before making a decision;</li>
                                                                    <li>Educating all staff on the processes and procedures of the Institution; and</li>
                                                                    <li>Avoiding pressures that might unduly influence decisions.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We shall treat one another equally and fairly.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Equity, Sincerity, Respect, Responsibility and Integrity.</p>
                                                            </div>

                                                            {/* 2.8 Loyalty */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.8. LOYALTY</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Being faithful and committed to an ideal, a cause, person, community, country, and to those with whom one interacts, while avoiding any conflict of interest.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Observing the decree creating CONAC, the Internal Rules and Regulations, the Statute of Personnel and this Code of Ethics;</li>
                                                                    <li>Upholding the laws of Cameroon and respecting State Institutions;</li>
                                                                    <li>Defending public interest in any situation of conflict of interest.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We shall be loyal to CONAC and the State.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Faithfulness, Honesty, Integrity, Respect, Responsibility, and Citizenship.</p>
                                                            </div>

                                                            {/* 2.9 Responsibility */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.9. RESPONSIBILITY</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Having the capacity to take or implement ethical decisions without fear or favour.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Speaking out and acting without fear or favour;</li>
                                                                    <li>Reporting all concerns, deeds or misdeeds likely to affect the proper discharge of duties; and</li>
                                                                    <li>Seeking clarity and guidance whenever in doubt;</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We commit to be responsible in our actions and words.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Prudence, Accountability, Integrity, Honesty, Probity, and Impartiality.</p>
                                                            </div>

                                                            {/* 2.10 Patriotism */}
                                                            <div className="mb-4 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2.10. PATRIOTISM</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">Allegiance to the State and its Institutions.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Indicators:</p>
                                                                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                    <li>Respecting State laws and emblems;</li>
                                                                    <li>Projecting and protecting the image of the State; and</li>
                                                                    <li>Conforming to social and cultural values.</li>
                                                                </ul>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Commitment:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">We commit to be patriotic.</p>
                                                                <p className="font-medium text-gray-900 dark:text-gray-100 mt-2">Associated Principles:</p>
                                                                <p className="text-gray-700 dark:text-gray-300">Loyalty, Faithfulness, Responsibility, Integrity, Respect and Honesty.</p>
                                                            </div>
                                                        </div>

                                                        {/* PART THREE: IMPLEMENTATION */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base border-b border-gray-200 dark:border-gray-800 pb-2">
                                                                PART THREE: IMPLEMENTATION
                                                            </h3>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">3.1. SCOPE</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        The Code is applicable to all employees (permanent and non-permanent), service providers and partners of CONAC.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">3.2. FRAMEWORK</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        The Code has been established to complement Conic&#39;s existing referral instruments which are: its constituting decree,
                                                                        the Internal Rules and Regulations and the Statute of Personnel.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">3.3. PRINCIPLES</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">The application of the Code shall be:</p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-1">
                                                                        <li>Educational and corrective, but serious breaches shall be reported to the Coordination Committee of CONAC for appraisal;</li>
                                                                        <li>Fair and equitable;</li>
                                                                        <li>Self-enforcing, relying on:
                                                                            <ul className="list-circle pl-5 mt-1">
                                                                                <li>Self-respect,</li>
                                                                                <li>Peer pressure, and</li>
                                                                                <li>Whistle-blowing</li>
                                                                            </ul>
                                                                        </li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* PART FOUR: ETHICS COMMITTEE */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base border-b border-gray-200 dark:border-gray-800 pb-2">
                                                                PART FOUR: ETHICS COMMITTEE (CEC)
                                                            </h3>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.1. MISSION</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        To address and find advise on educational and corrective solutions to unethical behaviours of employees
                                                                        of the National Anti-Corruption Commission.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.2. DUTIES</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">The CEC shall:</p>
                                                                    <ol className="list-decimal pl-5 text-gray-700 dark:text-gray-300 mt-1">
                                                                        <li>Ensure the implementation of this Code of Ethics;</li>
                                                                        <li>Facilitate the review of the Code of Ethics as well as aspects of behaviour contained in the other CONAC referral instruments;</li>
                                                                        <li>Ensure that the National Anti-Corruption Commission employees are, at all times, informed and familiarized with ethical expectations of the Commission;</li>
                                                                        <li>Receive and deliberate on complaints of alleged unethical or unprofessional conduct of Staff;</li>
                                                                        <li>Refer, to the relevant internal authority, all complaints which, though linked with behaviour, do not fall within the competence of the CEC;</li>
                                                                        <li>Support research, surveys, training and education activities related to ethics;</li>
                                                                        <li>Update the administrative procedures of the Committee; and</li>
                                                                        <li>Transmit an annual activity report to the Chairman of CONAC.</li>
                                                                    </ol>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.3. COMPOSITION</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        The Ethics Committee shall consist of five members, namely: One (01) Coordinator, one Rapporteur (01) and three (03) Members
                                                                        elected by the CONAC staff in a secret ballot. After tally, the names of the first seven (07) elected persons shall be
                                                                        forwarded to the Coordination Committee for the final decision on the composition of the CEC.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.4. TENURE OF OFFICE</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        Ethics Committee Members shall serve for a three-year term renewable once.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.5. LOSS OF MEMBERSHIP</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">Shall cease to be a member of the CEC, any:</p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                        <li>Whose employment is terminated;</li>
                                                                        <li>Who is guilty of gross misconduct.</li>
                                                                    </ul>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">In the event of vacancy, fresh elections shall be organised.</p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.6. ADMINISTRATIVE PROCEDURES</h4>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                        <li>The CEC shall meet when necessary, at most twice a year, at the behest of the Chairman of CONAC;</li>
                                                                        <li>The Coordinator and two other members shall constitute a quorum for any valid session of the CEC;</li>
                                                                        <li>All sessions of the CEC shall be presided at by the Coordinator. In the event of his absence, the eldest member present shall preside;</li>
                                                                        <li>Decisions of the CEC shall be arrived at through a simple majority;</li>
                                                                        <li>The CEC may invite anyone it deems necessary for the success of the deliberations;</li>
                                                                        <li>CONAC shall ensure the popularization of this Code of Ethics; and</li>
                                                                        <li>A resolution of the Coordination Committee of CONAC shall determine the seating allowances of CEC members.</li>
                                                                    </ul>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">4.7. PROCEDURE IN COMPLAINT HANDLING</h4>
                                                                    <ol className="list-decimal pl-5 text-gray-700 dark:text-gray-300">
                                                                        <li>Receipt of complaint or information through a suggestion and denunciation box or any other channel;</li>
                                                                        <li>Analysis;</li>
                                                                        <li>Investigation;</li>
                                                                        <li>Appropriate action.</li>
                                                                    </ol>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* CNEC SPECIFIC ETHICAL FRAMEWORK */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base border-b border-gray-200 dark:border-gray-800 pb-2">
                                                                CAMEROON NATIONAL ETHICS COMMITTEE (CNEC) FRAMEWORK
                                                            </h3>

                                                            <div className="space-y-4">
                                                                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900">
                                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">📋 SUBMISSION REQUIREMENTS</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">All research protocols involving human participants, data, or materials must be submitted with:</p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                                        <li><span className="font-medium">04 printed copies</span> (02 for students) of comprehensive documentation</li>
                                                                        <li><span className="font-medium">USB flash drive</span> containing the complete PDF version</li>
                                                                        <li><span className="font-medium">Proof of payment</span> for submission fees</li>
                                                                        <li><span className="font-medium">Signed, two-copy discharge sheet</span> (one retained by applicant)</li>
                                                                    </ul>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-2 font-medium">
                                                                        ⚠️ Deadline: Protocols must be submitted one month in advance for review.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">SCOPE AND COVERAGE</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">The committee oversees all health research, including:</p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-1">
                                                                        <li>Clinical trials and biomedical research</li>
                                                                        <li>Traditional and alternative medicine studies</li>
                                                                        <li>Social sciences research involving health aspects</li>
                                                                        <li>Research involving human participants, data, or biological materials</li>
                                                                    </ul>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-1 italic">
                                                                        Mandated by the 2022 legal framework for ethical research.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">ETHICAL PRINCIPLES</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">Protocols are reviewed against the following core principles:</p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-1">
                                                                        <li><span className="font-medium">Informed Consent:</span> Clear documentation, risk disclosure, and voluntary participation</li>
                                                                        <li><span className="font-medium">Confidentiality:</span> Protection of participant privacy and data security</li>
                                                                        <li><span className="font-medium">Vulnerable Populations:</span> Special protections for minors, pregnant women, and other vulnerable groups</li>
                                                                        <li><span className="font-medium">Risk-Benefit Assessment:</span> Favorable balance of potential benefits over risks</li>
                                                                    </ul>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">CLINICAL TRIALS AND GCP</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        All clinical trials involving human subjects must adhere to Good Clinical Practice (GCP) standards.
                                                                        The CNEC reviews protocols to ensure compliance with international ethical and scientific quality requirements.
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">MONITORING AND COMPLIANCE</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">The committee actively monitors:</p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-1">
                                                                        <li>Approved protocols throughout the research lifecycle</li>
                                                                        <li>Transfer of biological materials abroad</li>
                                                                        <li>Compliance with informed consent procedures</li>
                                                                        <li>Adherence to submitted protocols</li>
                                                                    </ul>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">DATA PROTECTION AND PRIVACY</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        In accordance with national policies on data privacy and cybersecurity:
                                                                    </p>
                                                                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mt-1">
                                                                        <li>Electronic health records must maintain strict confidentiality</li>
                                                                        <li>Data security measures must be implemented for digital research data</li>
                                                                        <li>Compliance with Cameroon&#39;s data protection regulations is mandatory</li>
                                                                    </ul>
                                                                </div>

                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">VALIDITY AND DOCUMENTATION</h4>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        All submissions require a signed, two-copy discharge sheet. One copy is retained by the applicant
                                                                        as proof of submission. Incomplete documentation will result in delayed review.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* COMMITMENT STATEMENT AND INTEGRITY PACT */}
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base border-b border-gray-200 dark:border-gray-800 pb-2">
                                                                COMMITMENT AND ACKNOWLEDGMENT
                                                            </h3>

                                                            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900">
                                                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">5.1. COLLECTIVE COMMITMENT STATEMENT</h4>
                                                                <p className="text-gray-700 dark:text-gray-300 italic">
                                                                    &#34;We, the employees of the National Anti-Corruption Commission, having set ourselves these core values and principles
                                                                    embodied in this Code of Ethics, commit ourselves to consistently apply them and be accountable for our behaviour.&#34;
                                                                </p>
                                                            </div>

                                                            <div className="mt-3 p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md">
                                                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">5.2. INTEGRITY PACT</h4>
                                                                <p className="text-gray-700 dark:text-gray-300">
                                                                    &#34;I, the undersigned, Employee/Service Provider/Contractor in CONAC, undertake to respect and apply, in all circumstances,
                                                                    the values and principles enshrined in the CONAC Code of Ethics and face the consequences in the case of any violation.&#34;
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* CONTACT INFORMATION */}
                                                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                                                CONTACT INFORMATION
                                                            </h3>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        <span className="font-medium">Headquarters:</span><br />
                                                                        Yaounde Conference Centre
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                        <span className="font-medium">Tel:</span><br />
                                                                        222 20 37 32<br />
                                                                        651 64 91 94<br />
                                                                        658 26 26 82<br />
                                                                        242 65 68 93
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        <span className="font-medium">Fax:</span><br />
                                                                        222 20 37 30
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                        <span className="font-medium">P.O. Box:</span><br />
                                                                        33 200 Yaounde
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                        <span className="font-medium">Email:</span><br />
                                                                        info@conac.cm
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                        <span className="font-medium">Website:</span><br />
                                                                        www.conac.cm
                                                                    </p>
                                                                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                                                                        <span className="font-medium">Hotline:</span><br />
                                                                        1517
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ACKNOWLEDGMENT */}
                                                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">
                                                                This Code of Ethics was developed drawing inspiration from existing Codes of Ethics of sister-agencies:
                                                                Anti-Corruption Commission of Zambia, Administrative Control Authority of Egypt,
                                                                Directorate of Corruption and Economic Crimes of Botswana, and Independent Corrupt Practices
                                                                and Other Related Offences Commission of Nigeria.
                                                            </p>
                                                        </div>

                                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center border-t border-gray-200 dark:border-gray-800 pt-4 mt-2">
                                                            By accepting these terms, you acknowledge that you have read, understood, and agree to comply with
                                                            all CNEC ethical guidelines and submission requirements as mandated by Cameroonian law and international ethical standards.
                                                            You commit to uphold the highest standards of integrity, transparency, and accountability in the service of Cameroon.
                                                        </p>
                                                    </div>
                                                </ScrollArea>
                                                {/* Bottom Left Button Footer */}
                                                <div className="flex justify-start items-center px-6 py-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shrink-0">
                                                    <Button
                                                        onClick={() => {
                                                            setTermsDialogOpen(false);
                                                            form.setValue("termsAccepted", true, { shouldValidate: true });
                                                        }}
                                                        className="bg-blue-700 hover:bg-blue-800 text-white"
                                                    >
                                                        I Understand and Agree
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        By creating an account, you consent to comply with CNET&#39;s ethical framework, research guidelines, and the CONAC Code of Ethics.
                                    </p>
                                </div>
                            </div>
                            {form.formState.errors.termsAccepted && (
                                <FieldError
                                    errors={[form.formState.errors.termsAccepted]}
                                    className="text-xs text-red-600 dark:text-red-400 mt-1 ml-7"
                                />
                            )}
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>

            <CardFooter className="flex flex-col w-full px-6 pt-2 pb-4">
                <div className="flex flex-col w-full gap-3">
                    <Button
                        type="submit"
                        form="signup-form"
                        disabled={form.formState.isSubmitting || !form.watch("termsAccepted")}
                        className="w-full h-11 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {form.formState.isSubmitting ? (
                            <Spinner className="size-4" />
                        ) : (
                            "Create Account"
                        )}
                    </Button>

                    <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                        Already have an account?{" "}
                        <Link
                            href="/sign-in"
                            className="font-medium text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="relative my-6 w-full">
                    <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="flex flex-col w-full gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={signInWithGoogle}
                        className="w-full h-11 text-sm border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-colors dark:border-gray-700 dark:hover:bg-gray-900 dark:text-gray-300"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 48 48"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.73 1.22 9.24 3.6l6.9-6.9C35.68 2.4 30.2 0 24 0 14.64 0 6.4 5.4 2.44 13.24l8.04 6.24C12.6 13.02 17.76 9.5 24 9.5z"
                            />
                            <path
                                fill="#4285F4"
                                d="M46.5 24.5c0-1.64-.14-3.2-.4-4.7H24v9h12.7c-.55 2.96-2.2 5.47-4.7 7.16l7.2 5.6C43.9 37.8 46.5 31.7 46.5 24.5z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M10.48 28.48A14.5 14.5 0 019.5 24c0-1.56.27-3.07.75-4.48l-8.04-6.24A23.96 23.96 0 000 24c0 3.8.9 7.4 2.48 10.72l8-6.24z"
                            />
                            <path
                                fill="#34A853"
                                d="M24 48c6.2 0 11.68-2.05 15.58-5.6l-7.2-5.6c-2 1.35-4.55 2.15-8.38 2.15-6.24 0-11.4-3.52-13.52-8.98l-8 6.24C6.4 42.6 14.64 48 24 48z"
                            />
                        </svg>
                        Continue with Google
                    </Button>
                </div>
            </CardFooter>

            <div className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    &copy; 2026 CNEC - Cameroon National Ethics Community. All rights reserved.
                </p>
            </div>
        </Card>
    );
}