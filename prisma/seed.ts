import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

async function main() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL or DIRECT_URL must be set in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const adminEmail = process.env.ADMIN_EMAIL || "admin@cnec.cm";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@CNEC2026";
    const adminName = process.env.ADMIN_NAME || "CNEC Admin";

    console.log("🌱 Seeding database...\n");

    // ─── 1. Create Admin User ──────────────────────────────────
    let adminUserId: string;

    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingUser) {
        adminUserId = existingUser.id;
        if (existingUser.role !== "admin") {
            await prisma.user.update({
                where: { email: adminEmail },
                data: { role: "admin" },
            });
            console.log(`✅ Existing user ${adminEmail} promoted to admin role`);
        } else {
            console.log(`ℹ️  Admin user ${adminEmail} already exists`);
        }
    } else {
        adminUserId = randomUUID();
        const accountId = randomUUID();
        const hashedPassword = await hashPassword(adminPassword);

        await prisma.user.create({
            data: {
                id: adminUserId,
                email: adminEmail,
                name: adminName,
                role: "admin",
                emailVerified: true,
                bio: "Platform administrator for the Cameroon National Ethics Community.",
                image: "https://api.dicebear.com/9.x/initials/svg?seed=CNEC&backgroundColor=1d4ed8",
                gender: "male",
            },
        });

        await prisma.account.create({
            data: {
                id: accountId,
                accountId: adminUserId,
                providerId: "credential",
                userId: adminUserId,
                password: hashedPassword,
            },
        });

        console.log(`✅ Admin user created: ${adminEmail}`);
    }

    // ─── 2. Create Prototype Users ─────────────────────────────
    const prototypeUsers = [
        {
            name: "Amina Bello",
            email: "amina.bello@cnec.cm",
            bio: "Public health researcher focused on maternal healthcare in rural Cameroon. Passionate about community-driven health solutions.",
            gender: "female" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Amina&backgroundColor=b6e3f4",
        },
        {
            name: "Jean-Pierre Nkomo",
            email: "jp.nkomo@cnec.cm",
            bio: "Environmental scientist at the University of Yaoundé. Researching sustainable agriculture and climate change adaptation.",
            gender: "male" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=JeanPierre&backgroundColor=c0aede",
        },
        {
            name: "Fatima Oumarou",
            email: "fatima.oumarou@cnec.cm",
            bio: "Education policy specialist working with UNICEF Cameroon. Advocating for inclusive education across the Far North region.",
            gender: "female" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Fatima&backgroundColor=ffdfbf",
        },
        {
            name: "Paul Etienne Mbarga",
            email: "paul.mbarga@cnec.cm",
            bio: "Bioethics professor and member of the National Ethics Committee. Specializing in clinical trial oversight.",
            gender: "male" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Paul&backgroundColor=d1d4f9",
        },
        {
            name: "Grace Ngono Fon",
            email: "grace.ngono@cnec.cm",
            bio: "Tech entrepreneur building digital health platforms. Co-founder of CamHealth Solutions.",
            gender: "female" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Grace&backgroundColor=ffd5dc",
        },
        {
            name: "Ibrahim Adamou",
            email: "ibrahim.adamou@cnec.cm",
            bio: "Agricultural extension officer in the Adamawa region. Working on food security and community development projects.",
            gender: "male" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ibrahim&backgroundColor=c1f0c1",
        },
        {
            name: "Marie-Claire Tchaptchet",
            email: "mc.tchaptchet@cnec.cm",
            bio: "Social worker and community organizer. Running youth empowerment programs across Douala.",
            gender: "female" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=MarieClaire&backgroundColor=ffeaa7",
        },
        {
            name: "Samuel Tabi Egbe",
            email: "samuel.tabi@cnec.cm",
            bio: "Data scientist working on health informatics. Building predictive models for disease surveillance in Central Africa.",
            gender: "male" as const,
            image: "https://api.dicebear.com/9.x/avataaars/svg?seed=Samuel&backgroundColor=dfe6e9",
        },
    ];

    const defaultPassword = await hashPassword("User@CNEC2026");
    const userIds: string[] = [adminUserId];

    for (const userData of prototypeUsers) {
        const existing = await prisma.user.findUnique({ where: { email: userData.email } });
        if (existing) {
            userIds.push(existing.id);
            console.log(`ℹ️  User ${userData.email} already exists`);
            continue;
        }

        const userId = randomUUID();
        const accountId = randomUUID();

        await prisma.user.create({
            data: {
                id: userId,
                email: userData.email,
                name: userData.name,
                role: "user",
                emailVerified: true,
                bio: userData.bio,
                image: userData.image,
                gender: userData.gender,
            },
        });

        await prisma.account.create({
            data: {
                id: accountId,
                accountId: userId,
                providerId: "credential",
                userId: userId,
                password: defaultPassword,
            },
        });

        userIds.push(userId);
        console.log(`✅ User created: ${userData.name}`);
    }

    // Check if prototype data already exists
    const existingPosts = await prisma.post.count();
    if (existingPosts > 0) {
        console.log("\nℹ️  Prototype data already exists, skipping data seeding.");
        console.log("🌱 Seeding complete!");
        await prisma.$disconnect();
        await pool.end();
        return;
    }

    // ─── 3. Create Feed Posts with Images and Videos ───────────
    console.log("\n📝 Creating feed posts...");

    const feedPosts = [
        {
            content: "🎉 Excited to announce that our maternal health research project in the Far North region has been approved by the ethics committee! This study will help improve prenatal care for over 5,000 women in rural communities. Thank you to everyone who supported this initiative! #MaternalHealth #Cameroon #Research",
            image: "https://picsum.photos/seed/maternal-health/800/500",
            images: [
                "https://picsum.photos/seed/clinic-rural/800/500",
                "https://picsum.photos/seed/healthcare-team/800/500",
            ],
            tags: ["health", "research", "community"],
            userIndex: 1,
        },
        {
            content: "Just completed a field survey on sustainable farming practices in the Adamawa region 🌾. The data shows promising results for drought-resistant crop varieties. Local farmers are eager to adopt these new techniques. Will be presenting our findings at the upcoming CNEC symposium.",
            image: "https://picsum.photos/seed/farming-cameroon/800/500",
            images: [
                "https://picsum.photos/seed/crops-field/800/500",
                "https://picsum.photos/seed/farmer-working/800/500",
                "https://picsum.photos/seed/harvest-season/800/500",
            ],
            tags: ["agriculture", "sustainability", "research"],
            userIndex: 6,
        },
        {
            content: "📚 Our new inclusive education program has reached 12 schools in the Far North region! Children with disabilities now have access to adapted learning materials and trained teachers. Education is a right, not a privilege. @Amina Bello thank you for the collaboration!",
            image: "https://picsum.photos/seed/education-africa/800/500",
            tags: ["education", "inclusion", "development"],
            userIndex: 3,
        },
        {
            content: "Important reminder: All research projects involving human subjects must receive ethical clearance before data collection begins. The CNEC review process typically takes 4-6 weeks. Submit your applications early! Check the guidelines on our platform. #EthicsReview #ResearchIntegrity",
            tags: ["ethics", "guidelines", "research"],
            userIndex: 4,
        },
        {
            content: "🚀 Thrilled to share that CamHealth Solutions just launched our telemedicine platform! Rural health workers can now consult specialists in Yaoundé and Douala via video calls. Already 50+ consultations completed in the first week. Technology bridging the healthcare gap! 🏥",
            image: "https://picsum.photos/seed/telemedicine-app/800/500",
            video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            tags: ["technology", "health", "innovation"],
            userIndex: 5,
        },
        {
            content: "Reflecting on today's workshop on research ethics in clinical trials. Key takeaways:\n\n1️⃣ Informed consent must be truly informed - use local languages\n2️⃣ Community engagement is not optional\n3️⃣ Data privacy protections need constant updating\n4️⃣ Vulnerable populations require extra safeguards\n\nGreat discussions with colleagues from across the country.",
            image: "https://picsum.photos/seed/workshop-ethics/800/500",
            tags: ["ethics", "clinical-trials", "workshop"],
            userIndex: 4,
        },
        {
            content: "🌍 Climate change is affecting farming patterns across Central Africa. Our latest research shows rainfall patterns have shifted by 2-3 weeks in the past decade. This directly impacts food security for millions. We need urgent policy action. Read our full report on the CNEC platform.",
            image: "https://picsum.photos/seed/climate-change-africa/800/500",
            images: [
                "https://picsum.photos/seed/drought-land/800/500",
                "https://picsum.photos/seed/rainfall-data/800/500",
            ],
            tags: ["climate", "environment", "policy"],
            userIndex: 2,
        },
        {
            content: "Youth empowerment workshop in Douala was a huge success! 🙌 Over 200 young people participated in sessions on entrepreneurship, digital skills, and civic engagement. These are the future leaders of Cameroon! 🇨🇲",
            image: "https://picsum.photos/seed/youth-workshop/800/500",
            images: [
                "https://picsum.photos/seed/young-leaders/800/500",
                "https://picsum.photos/seed/douala-event/800/500",
                "https://picsum.photos/seed/workshop-group/800/500",
            ],
            video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            tags: ["youth", "empowerment", "education"],
            userIndex: 7,
        },
        {
            content: "📊 Sharing our latest disease surveillance dashboard powered by AI. The system can now predict malaria outbreaks 2 weeks in advance with 87% accuracy. Working with the Ministry of Health to roll this out nationwide. @Grace Ngono Fon great collaboration on this project!",
            image: "https://picsum.photos/seed/data-dashboard/800/500",
            tags: ["technology", "health", "AI"],
            userIndex: 8,
        },
        {
            content: "Just visited the new community health center in Bamenda funded through our CNEC-approved project. The facility is now serving over 300 patients daily. This is what happens when research meets action! So proud of our team. 💪",
            image: "https://picsum.photos/seed/health-center/800/500",
            images: [
                "https://picsum.photos/seed/bamenda-clinic/800/500",
                "https://picsum.photos/seed/medical-staff/800/500",
            ],
            tags: ["health", "infrastructure", "community"],
            userIndex: 1,
        },
        {
            content: "🔬 New publication alert! Our paper on ethical frameworks for AI in healthcare has been accepted in the African Journal of Bioethics. This work establishes guidelines for responsible AI deployment in resource-limited settings. Full paper link coming soon!",
            tags: ["publication", "AI", "ethics", "research"],
            userIndex: 4,
        },
        {
            content: "The water quality testing project in the Littoral region has produced concerning results. 40% of tested wells show contamination levels above WHO guidelines. We're working with local authorities to address this urgently. Clean water is a basic human right. 💧",
            image: "https://picsum.photos/seed/water-testing/800/500",
            tags: ["environment", "health", "water"],
            userIndex: 2,
        },
        {
            content: "🎓 Congratulations to our 15 graduate students who completed the CNEC Research Ethics Certification Program! You are now equipped to lead ethical research across Cameroon. The future of research integrity is bright! 🌟",
            image: "https://picsum.photos/seed/graduation-ceremony/800/500",
            images: [
                "https://picsum.photos/seed/certificate-award/800/500",
                "https://picsum.photos/seed/graduates-group/800/500",
            ],
            tags: ["education", "ethics", "certification"],
            userIndex: 0,
        },
        {
            content: "Day 3 of our field research on traditional medicine practices in the Northwest Region. Documenting incredible indigenous knowledge systems. The healers have been incredibly generous in sharing their expertise. This data will help bridge traditional and modern medicine. 🌿",
            image: "https://picsum.photos/seed/traditional-medicine/800/500",
            video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            tags: ["research", "traditional-medicine", "culture"],
            userIndex: 1,
        },
        {
            content: "Important policy update: The National Ethics Committee has released new guidelines for genetic research involving Cameroonian populations. All ongoing studies must comply by the end of Q2. Summary of key changes:\n\n• Enhanced community consent requirements\n• Mandatory benefit-sharing agreements\n• Stricter data sovereignty provisions\n\nDetails on the CNEC platform.",
            tags: ["policy", "genetics", "ethics", "guidelines"],
            userIndex: 0,
        },
    ];

    const createdPostIds: string[] = [];
    const baseDate = new Date();

    for (let i = 0; i < feedPosts.length; i++) {
        const postData = feedPosts[i];
        const post = await prisma.post.create({
            data: {
                content: postData.content,
                image: postData.image || null,
                video: postData.video || null,
                images: postData.images || [],
                videos: [],
                tags: postData.tags || [],
                userId: userIds[postData.userIndex],
                createdAt: new Date(baseDate.getTime() - i * 3600000 * 3),
            },
        });
        createdPostIds.push(post.id);
    }
    console.log(`✅ Created ${feedPosts.length} feed posts`);

    // ─── 4. Create Comments on Posts ───────────────────────────
    console.log("💬 Creating comments...");

    const comments = [
        { postIndex: 0, userIndex: 2, content: "This is amazing news! Maternal health research is so crucial for our communities. Can't wait to see the results. 🙏" },
        { postIndex: 0, userIndex: 5, content: "Congratulations @Amina Bello! The Far North region really needs this kind of research. How can we support?" },
        { postIndex: 0, userIndex: 0, content: "Excellent work! The ethics committee was impressed by the thoroughness of your proposal. Wishing you success." },
        { postIndex: 1, userIndex: 1, content: "Great findings! Drought-resistant crops are essential for food security. Would love to collaborate on this research." },
        { postIndex: 1, userIndex: 3, content: "This is exactly the kind of applied research Cameroon needs. When is the symposium presentation scheduled?" },
        { postIndex: 2, userIndex: 1, content: "Inclusive education is transformative. These children deserve every opportunity. Amazing work @Fatima Oumarou!" },
        { postIndex: 2, userIndex: 7, content: "12 schools already! That's incredible progress. How are teachers responding to the training?" },
        { postIndex: 3, userIndex: 5, content: "Thanks for the reminder! Just submitted our application last week. The new online submission system is much better." },
        { postIndex: 4, userIndex: 8, content: "This is groundbreaking! Telemedicine can truly transform healthcare access in rural areas. 🚀" },
        { postIndex: 4, userIndex: 1, content: "50 consultations in the first week is impressive! What specialties are most in demand?" },
        { postIndex: 4, userIndex: 4, content: "Important question: how are you handling informed consent for telemedicine consultations? This needs careful ethical consideration." },
        { postIndex: 5, userIndex: 3, content: "Key point about local languages for informed consent. In many rural areas, written consent forms are not sufficient." },
        { postIndex: 5, userIndex: 1, content: "I'd love access to the workshop materials. Can you share them on the platform?" },
        { postIndex: 6, userIndex: 6, content: "We're seeing this impact firsthand in the Adamawa region. Planting seasons are shifting and farmers are struggling to adapt." },
        { postIndex: 6, userIndex: 4, content: "The policy implications here are enormous. We need to present this data to lawmakers. Can we schedule a meeting?" },
        { postIndex: 7, userIndex: 5, content: "This is so inspiring! Youth are the backbone of Cameroon's future. When's the next workshop? 🇨🇲" },
        { postIndex: 7, userIndex: 1, content: "200 participants! Wow. The energy in these workshops is always incredible. Well done @Marie-Claire Tchaptchet!" },
        { postIndex: 8, userIndex: 5, content: "87% accuracy is remarkable! How are you handling data privacy in the surveillance system?" },
        { postIndex: 8, userIndex: 4, content: "This is exactly where AI can make a real difference in healthcare. Ethical deployment is key though." },
        { postIndex: 9, userIndex: 3, content: "300 patients daily is a huge impact. This shows the value of CNEC-approved research leading to real infrastructure." },
        { postIndex: 9, userIndex: 7, content: "So proud to see research translating into action! This is what community impact looks like. 💪" },
        { postIndex: 10, userIndex: 2, content: "Congratulations on the publication! Ethical AI frameworks are desperately needed. Will definitely read it." },
        { postIndex: 11, userIndex: 1, content: "40% contamination is alarming. We need to mobilize resources immediately. What can researchers do to help?" },
        { postIndex: 11, userIndex: 7, content: "Clean water access is a crisis in many regions. Thank you for bringing data to this issue." },
        { postIndex: 12, userIndex: 3, content: "Congratulations to all the graduates! Well-trained ethics reviewers are essential for quality research." },
        { postIndex: 12, userIndex: 5, content: "This certification program is one of the best things CNEC has done. Can we expand it to more universities?" },
        { postIndex: 13, userIndex: 4, content: "Traditional medicine research must be conducted with deep respect for indigenous knowledge holders. Important ethical considerations." },
        { postIndex: 13, userIndex: 6, content: "This is fascinating! Traditional healers have generations of knowledge. Looking forward to the findings." },
    ];

    const createdCommentIds: string[] = [];
    for (let i = 0; i < comments.length; i++) {
        const c = comments[i];
        const comment = await prisma.comment.create({
            data: {
                content: c.content,
                postId: createdPostIds[c.postIndex],
                userId: userIds[c.userIndex],
                createdAt: new Date(baseDate.getTime() - (c.postIndex * 3600000 * 3) + (i + 1) * 600000),
            },
        });
        createdCommentIds.push(comment.id);
    }
    console.log(`✅ Created ${comments.length} comments`);

    // ─── 5. Create Comment Replies ─────────────────────────────
    console.log("↩️  Creating comment replies...");

    const replies = [
        { parentIndex: 0, postIndex: 0, userIndex: 1, content: "Thank you so much! The results should be available by mid-year. We'll share them here on CNEC." },
        { parentIndex: 1, postIndex: 0, userIndex: 1, content: "Thank you! You can support by helping us recruit participants in your area. DM me for details." },
        { parentIndex: 3, postIndex: 1, userIndex: 6, content: "Absolutely! Let's connect. I'll send you our preliminary data. Cross-regional collaboration would be valuable." },
        { parentIndex: 8, postIndex: 4, userIndex: 5, content: "Cardiology and dermatology are the top two so far. We're adding pediatrics next month!" },
        { parentIndex: 10, postIndex: 4, userIndex: 5, content: "Great point, Professor. We have a detailed consent protocol with verbal consent option in local languages." },
        { parentIndex: 15, postIndex: 7, userIndex: 7, content: "Next workshop is scheduled for March in Bafoussam! Registration will open on the platform soon." },
    ];

    for (const r of replies) {
        await prisma.comment.create({
            data: {
                content: r.content,
                postId: createdPostIds[r.postIndex],
                userId: userIds[r.userIndex],
                parentId: createdCommentIds[r.parentIndex],
                createdAt: new Date(baseDate.getTime() + 1800000),
            },
        });
    }
    console.log(`✅ Created ${replies.length} comment replies`);

    // ─── 6. Create Likes on Posts ──────────────────────────────
    console.log("❤️  Creating likes...");

    let likeCount = 0;
    for (let i = 0; i < createdPostIds.length; i++) {
        const numLikes = Math.min(3 + (i % 5), userIds.length);
        const likerIndices = Array.from({ length: userIds.length }, (_, k) => k)
            .filter((k) => k !== feedPosts[i].userIndex)
            .slice(0, numLikes);

        for (const idx of likerIndices) {
            await prisma.like.create({
                data: { postId: createdPostIds[i], userId: userIds[idx] },
            });
            likeCount++;
        }
    }
    console.log(`✅ Created ${likeCount} post likes`);

    // ─── 7. Create Comment Likes ───────────────────────────────
    console.log("👍 Creating comment likes...");

    let commentLikeCount = 0;
    for (let i = 0; i < Math.min(createdCommentIds.length, 15); i++) {
        const likerId = userIds[(i + 3) % userIds.length];
        const commentUserId = userIds[comments[i].userIndex];
        if (likerId !== commentUserId) {
            await prisma.commentLike.create({
                data: {
                    commentId: createdCommentIds[i],
                    userId: likerId,
                    isDislike: false,
                },
            });
            commentLikeCount++;
        }
    }
    console.log(`✅ Created ${commentLikeCount} comment likes`);

    // ─── 8. Create Community Topics ────────────────────────────
    console.log("\n🏘️  Creating community topics...");

    const communityTopics = [
        {
            title: "Welcome to the CNEC Community!",
            content: "Hello everyone! 👋 Welcome to the Cameroon National Ethics Community platform. This is your space to discuss ethical issues, share research findings, and collaborate on projects that matter. Feel free to introduce yourself and tell us about your work!",
            category: "General",
            userIndex: 0,
        },
        {
            title: "Monthly Ethics Discussion: Informed Consent in Low-Literacy Populations",
            content: "This month's ethics discussion focuses on the challenges of obtaining truly informed consent from populations with low literacy levels. How do we ensure participants fully understand research risks and benefits when written consent forms are inadequate? Share your experiences and best practices.\n\nKey questions:\n1. What alternative consent methods have you used successfully?\n2. How do you verify understanding beyond signed forms?\n3. What role should community leaders play in the consent process?",
            category: "Ethics",
            userIndex: 4,
        },
        {
            title: "Best Practices for Community-Based Participatory Research",
            content: "I'm compiling a guide on community-based participatory research (CBPR) methods for the Cameroonian context. Looking for input from researchers who have experience engaging communities as true partners in the research process, not just as subjects.\n\nTopics I want to cover:\n- Building trust with communities\n- Shared decision-making frameworks\n- Benefit-sharing models\n- Long-term community engagement strategies",
            category: "Research",
            userIndex: 2,
        },
        {
            title: "New Data Protection Law: Implications for Research",
            content: "Cameroon's new data protection legislation has significant implications for how we handle research data. Key changes include:\n\n📌 Mandatory data protection impact assessments\n📌 New requirements for cross-border data transfers\n📌 Enhanced rights for research participants\n📌 Penalties for non-compliance\n\nLet's discuss how these changes affect our ongoing and planned research projects.",
            category: "Policy",
            userIndex: 4,
        },
        {
            title: "AI and Machine Learning in Healthcare: Ethical Considerations",
            content: "As AI becomes more prevalent in healthcare applications across Africa, we need to address several ethical concerns:\n\n🤖 Algorithmic bias in models trained on non-African data\n📊 Data privacy in health informatics systems\n🏥 Accountability when AI makes clinical recommendations\n👥 Ensuring equitable access to AI-powered healthcare\n\nWhat frameworks should guide AI deployment in Cameroonian healthcare settings?",
            category: "Technology",
            userIndex: 8,
        },
        {
            title: "Mental Health Research in Cameroon: Bridging the Gap",
            content: "Mental health remains severely underfunded and stigmatized across Cameroon. Our research group is conducting a national survey on mental health service availability. Preliminary findings show:\n\n- Only 3 psychiatrists per 1 million people\n- 80% of mental health conditions go untreated\n- Strong stigma barriers to seeking help\n\nHow can research help address this crisis? What ethical considerations should guide mental health studies?",
            category: "Health",
            userIndex: 1,
        },
        {
            title: "STEM Education Initiatives: What's Working?",
            content: "Let's share our experiences with STEM education programs across Cameroon. Our organization has been running coding bootcamps in Douala and Yaoundé, and we've seen incredible results:\n\n📈 500+ students trained in 2024\n💼 40% job placement rate within 6 months\n👩‍💻 45% female participation\n\nWhat other STEM education initiatives are showing promise? How do we scale these programs to rural areas?",
            category: "Education",
            userIndex: 5,
        },
        {
            title: "Vaccine Hesitancy: Research and Community Engagement Strategies",
            content: "Vaccine hesitancy continues to challenge public health efforts in several regions. Our community health team has been documenting the reasons behind hesitancy and testing engagement strategies.\n\nWhat has worked:\n✅ Community health champion programs\n✅ Religious leader partnerships\n✅ School-based awareness campaigns\n\nWhat hasn't worked:\n❌ Top-down messaging without community input\n❌ Ignoring local concerns about side effects\n\nLet's discuss evidence-based approaches to building vaccine confidence.",
            category: "Health",
            userIndex: 1,
        },
        {
            title: "Open Source Tools for Research Data Management",
            content: "Sharing some open source tools that have been game-changers for our research data management:\n\n1️⃣ REDCap - Electronic data capture\n2️⃣ ODK (Open Data Kit) - Mobile data collection\n3️⃣ R / RStudio - Statistical analysis\n4️⃣ DHIS2 - Health information systems\n5️⃣ KoBoToolbox - Field data collection\n\nWhat tools are you using? Any recommendations for researchers working in low-bandwidth environments?",
            category: "Technology",
            userIndex: 8,
        },
        {
            title: "Ethics of Traditional Medicine Research: A Framework Proposal",
            content: "I'm proposing a new ethical framework for research involving traditional medicine in Cameroon. The framework addresses:\n\n🌿 Intellectual property rights of traditional healers\n🤝 Community benefit-sharing from commercial applications\n📜 Documentation protocols that respect sacred knowledge\n🔬 Standards for validating traditional remedies\n\nWould appreciate feedback from both researchers and community members. This framework will be submitted to the CNEC for formal adoption.",
            category: "Ethics",
            userIndex: 4,
        },
        {
            title: "Grant Writing Workshop: Lessons Learned",
            content: "Just completed a 3-day grant writing workshop organized by CNEC. Here are the key takeaways for fellow researchers:\n\n📝 Start with a clear problem statement\n🎯 Align objectives with funder priorities\n💰 Be realistic with budgets\n📊 Include strong methodology sections\n🤝 Demonstrate community partnerships\n\nWho else attended? What were your takeaways?",
            category: "General",
            userIndex: 3,
        },
        {
            title: "Climate Change Adaptation Policies: Regional Perspectives",
            content: "Different regions of Cameroon face unique climate challenges. Let's compile regional perspectives:\n\n🏔️ Northwest/Southwest: Landslides and flooding\n🌾 Adamawa/North: Desertification and drought\n🌊 Littoral/Southwest: Coastal erosion and sea-level rise\n🌳 East/South: Deforestation and biodiversity loss\n\nWhat policy frameworks are most effective for each region? How do we ensure equitable resource allocation?",
            category: "Policy",
            userIndex: 2,
        },
    ];

    const createdTopicIds: string[] = [];
    for (let i = 0; i < communityTopics.length; i++) {
        const t = communityTopics[i];
        const topic = await prisma.communityTopic.create({
            data: {
                title: t.title,
                content: t.content,
                category: t.category,
                userId: userIds[t.userIndex],
                createdAt: new Date(baseDate.getTime() - i * 7200000),
            },
        });
        createdTopicIds.push(topic.id);
    }
    console.log(`✅ Created ${communityTopics.length} community topics`);

    // ─── 9. Create Community Replies ───────────────────────────
    console.log("💬 Creating community replies...");

    const communityReplies = [
        { topicIndex: 0, userIndex: 1, content: "Hello everyone! I'm Amina, a public health researcher in the Far North. Excited to join this community and share our work on maternal healthcare. Looking forward to collaborating!" },
        { topicIndex: 0, userIndex: 5, content: "Welcome aboard Amina! 🎉 I'm Grace from CamHealth Solutions. Love the work you're doing in maternal health. Let's connect!" },
        { topicIndex: 0, userIndex: 2, content: "Great to be here! Jean-Pierre from the University of Yaoundé. My focus is environmental science and climate change. Hope to find collaborators interested in interdisciplinary research." },
        { topicIndex: 0, userIndex: 6, content: "Hi all! Ibrahim here, working on agriculture and food security in Adamawa. Glad to see so many diverse researchers on this platform." },
        { topicIndex: 1, userIndex: 1, content: "In our maternal health studies, we use pictorial consent forms combined with verbal explanations in the local language. We also require a witness from the community who is not affiliated with the research team. This has been very effective." },
        { topicIndex: 1, userIndex: 3, content: "We've had success using video-based consent processes. Short videos in local languages explaining the research, followed by Q&A sessions. It takes more time but ensures genuine understanding." },
        { topicIndex: 1, userIndex: 7, content: "From our community work experience, involving community leaders early in the process is crucial, but they should facilitate understanding rather than influence the decision. We trained 20 community consent facilitators." },
        { topicIndex: 1, userIndex: 0, content: "These are excellent approaches. The CNEC is updating its consent guidelines to include these alternative methods. Your practical experiences are invaluable for this process.", image: "https://picsum.photos/seed/consent-forms/800/500" },
        { topicIndex: 2, userIndex: 1, content: "In our CBPR work, we found that holding community advisory board meetings quarterly works best. Monthly is too frequent and leads to fatigue, while biannual is too infrequent for meaningful engagement." },
        { topicIndex: 2, userIndex: 7, content: "Building trust takes time - sometimes years. We start with small community projects (like clean-up days or health screenings) before introducing research agendas. This shows we care about the community, not just data." },
        { topicIndex: 3, userIndex: 8, content: "This is very relevant for our health informatics work. We'll need to update our data handling protocols. Does anyone know if there's a grace period for compliance?" },
        { topicIndex: 3, userIndex: 5, content: "We at CamHealth are already implementing data protection by design in our telemedicine platform. Happy to share our compliance framework with other researchers and developers." },
        { topicIndex: 4, userIndex: 4, content: "Critical point about algorithmic bias. Most AI models are trained on data from high-income countries. When deployed in Cameroon, they can produce dangerously inaccurate results. We need locally-trained models." },
        { topicIndex: 4, userIndex: 5, content: "We're building a Cameroonian health dataset specifically to address this bias issue. It's slow work but essential. Would love to partner with other organizations collecting health data." },
        { topicIndex: 5, userIndex: 7, content: "Mental health stigma is a massive barrier. In our community programs, we've found that framing mental health as 'emotional wellness' reduces stigma significantly. Language matters." },
        { topicIndex: 5, userIndex: 4, content: "Research ethics in mental health are particularly sensitive. Participants may not be able to provide informed consent during crisis episodes. How do we handle this ethically?" },
        { topicIndex: 6, userIndex: 8, content: "The 45% female participation rate is impressive! In our data science bootcamps, we struggle to get above 30%. What strategies are you using to attract and retain women in STEM?" },
        { topicIndex: 6, userIndex: 7, content: "We partner with schools to identify talented girls early and provide scholarships. Mentorship from successful women in tech has been our most effective retention strategy.", image: "https://picsum.photos/seed/women-stem/800/500" },
        { topicIndex: 7, userIndex: 3, content: "Religious leader partnerships have been key in our region too. When the imam supports vaccination, uptake increases dramatically. But this approach requires genuine dialogue, not just using leaders as messengers." },
        { topicIndex: 7, userIndex: 6, content: "In the Adamawa region, we've seen a 25% increase in vaccine uptake after implementing community health champion programs. These are local people trained to address concerns in their own communities." },
        { topicIndex: 8, userIndex: 2, content: "KoBoToolbox has been incredible for our field work! Works offline and syncs when connectivity returns. Essential for research in areas without reliable internet." },
        { topicIndex: 8, userIndex: 6, content: "We use ODK extensively for agricultural surveys. The learning curve is minimal and community health workers can use it after just one training session." },
        { topicIndex: 9, userIndex: 1, content: "This framework is much needed! In my experience, many traditional healers are hesitant to share knowledge because they fear it will be exploited commercially without benefit returning to their communities." },
        { topicIndex: 9, userIndex: 2, content: "Agree with Amina. Benefit-sharing must be concrete and meaningful. We should look at how other African countries (like South Africa with the Hoodia case) have handled this." },
        { topicIndex: 10, userIndex: 2, content: "The workshop was excellent! I'd add: always have a local partner on your team. Funders love seeing genuine local ownership of research projects." },
        { topicIndex: 10, userIndex: 1, content: "Budget realism is so important. I've seen too many proposals with unrealistic travel budgets. Include realistic costs for community engagement activities!" },
        { topicIndex: 11, userIndex: 6, content: "In Adamawa, we're seeing pastoralists move further south each year due to drought. This creates conflict with farming communities. Policy must address both climate adaptation and conflict resolution." },
        { topicIndex: 11, userIndex: 1, content: "Coastal erosion in the Southwest is displacing entire communities. We need a national climate refugee policy. This is both a policy and a humanitarian issue." },
    ];

    for (let i = 0; i < communityReplies.length; i++) {
        const r = communityReplies[i];
        await prisma.communityReply.create({
            data: {
                content: r.content,
                image: (r as { image?: string }).image || null,
                topicId: createdTopicIds[r.topicIndex],
                userId: userIds[r.userIndex],
                createdAt: new Date(baseDate.getTime() - (r.topicIndex * 7200000) + (i + 1) * 900000),
            },
        });
    }
    console.log(`✅ Created ${communityReplies.length} community replies`);

    // ─── 10. Create Projects ───────────────────────────────────
    console.log("\n📂 Creating projects...");

    const projects = [
        {
            title: "Maternal Health Outcomes in Rural Far North Cameroon",
            description: "A longitudinal study examining maternal health outcomes across 25 rural health facilities in the Far North region. The study aims to identify factors contributing to maternal mortality and develop evidence-based interventions to improve prenatal and postnatal care.",
            objectives: "1. Document current maternal health practices\n2. Identify key risk factors for maternal complications\n3. Develop community-based intervention protocols\n4. Train 100 community health workers",
            category: "Health",
            location: "Far North Region, Cameroon",
            timeline: "January 2026 - December 2027",
            budget: "45,000,000 XAF",
            status: "APPROVED" as const,
            feedback: "Excellent proposal with strong community engagement component. Approved with recommendation to include quarterly progress reports.",
            userIndex: 1,
        },
        {
            title: "Sustainable Agriculture Practices for Climate Resilience",
            description: "Research project evaluating drought-resistant crop varieties and sustainable farming techniques for smallholder farmers in the Adamawa and Northern regions. Includes field trials, farmer training, and policy recommendations.",
            objectives: "1. Test 10 drought-resistant crop varieties\n2. Train 500 farmers in sustainable techniques\n3. Measure yield improvements over 2 growing seasons\n4. Develop region-specific farming guidelines",
            category: "Agriculture",
            location: "Adamawa Region, Cameroon",
            timeline: "March 2026 - February 2028",
            budget: "38,000,000 XAF",
            status: "PENDING_REVIEW" as const,
            userIndex: 6,
        },
        {
            title: "Digital Health Platform for Telemedicine Services",
            description: "Development and deployment of a telemedicine platform connecting rural health workers with specialist doctors in urban centers. The platform includes video consultation, diagnostic image sharing, and electronic health records.",
            objectives: "1. Deploy platform in 50 health facilities\n2. Enable 1,000+ teleconsultations per month\n3. Reduce patient referral wait times by 60%\n4. Train 200 health workers on platform use",
            category: "Technology",
            location: "National (Cameroon)",
            timeline: "February 2026 - January 2027",
            budget: "120,000,000 XAF",
            status: "APPROVED" as const,
            feedback: "Innovative project with potential for significant health impact. Ensure data privacy compliance and obtain additional informed consent for telemedicine recordings.",
            userIndex: 5,
        },
        {
            title: "Inclusive Education Program for Children with Disabilities",
            description: "Implementing inclusive education practices across 30 schools in the Far North and Adamawa regions. The project includes teacher training, adapted learning materials, and school infrastructure modifications.",
            objectives: "1. Train 200 teachers in inclusive education\n2. Develop adapted learning materials in 5 local languages\n3. Modify infrastructure in 30 schools for accessibility\n4. Enroll 500 children with disabilities",
            category: "Education",
            location: "Far North and Adamawa Regions",
            timeline: "April 2026 - March 2028",
            budget: "65,000,000 XAF",
            status: "SUBMITTED" as const,
            userIndex: 3,
        },
        {
            title: "Water Quality Assessment and Remediation in Littoral Region",
            description: "Comprehensive water quality testing across 200 wells and water sources in the Littoral Region. The project will identify contamination sources and implement community-level water treatment solutions.",
            objectives: "1. Test 200 water sources for key contaminants\n2. Map contamination patterns using GIS\n3. Install 50 community water treatment systems\n4. Train local committees on water quality monitoring",
            category: "Environment",
            location: "Littoral Region, Cameroon",
            timeline: "June 2026 - May 2027",
            budget: "28,000,000 XAF",
            status: "PENDING_REVIEW" as const,
            userIndex: 2,
        },
        {
            title: "Youth Digital Skills and Entrepreneurship Program",
            description: "A comprehensive training program for 300 youth in Douala and Yaoundé covering coding, digital marketing, entrepreneurship, and financial literacy. Includes mentorship and seed funding for the best business proposals.",
            objectives: "1. Train 300 youth in digital skills\n2. Launch 50 youth-led micro-enterprises\n3. Achieve 40% female participation\n4. Create a mentorship network of 100 professionals",
            category: "Social Development",
            location: "Douala and Yaoundé",
            timeline: "January 2026 - December 2026",
            budget: "55,000,000 XAF",
            status: "APPROVED" as const,
            feedback: "Strong proposal with measurable outcomes. Recommended to include follow-up mentorship beyond the program period.",
            userIndex: 7,
        },
        {
            title: "AI-Powered Disease Surveillance System",
            description: "Development of a machine learning-based disease surveillance system for early detection of malaria, cholera, and dengue outbreaks. Integrates data from health facilities, weather stations, and population movement patterns.",
            objectives: "1. Build predictive models with 85%+ accuracy\n2. Integrate data from 100 health facilities\n3. Deploy real-time monitoring dashboard\n4. Reduce outbreak response time by 50%",
            category: "Technology",
            location: "National (Cameroon)",
            timeline: "March 2026 - February 2027",
            budget: "85,000,000 XAF",
            status: "SUBMITTED" as const,
            userIndex: 8,
        },
        {
            title: "Traditional Medicine Documentation and Validation",
            description: "Systematic documentation and scientific validation of traditional medicine practices across the Northwest and Southwest regions. Working in partnership with traditional healers to preserve indigenous knowledge while exploring therapeutic potential.",
            objectives: "1. Document 200 traditional remedies\n2. Scientifically validate 50 highest-potential treatments\n3. Establish 10 traditional healer partnerships\n4. Create a digital archive of traditional medicine knowledge",
            category: "Health",
            location: "Northwest and Southwest Regions",
            timeline: "May 2026 - April 2028",
            budget: "42,000,000 XAF",
            status: "DRAFT" as const,
            userIndex: 1,
        },
        {
            title: "Community Mental Health Awareness Campaign",
            description: "A multi-channel awareness campaign to reduce mental health stigma across five regions of Cameroon. Includes radio programs, community workshops, school-based interventions, and training of community mental health workers.",
            objectives: "1. Reach 100,000 people through awareness campaigns\n2. Train 50 community mental health workers\n3. Establish 10 community support groups\n4. Reduce stigma scores by 30% in target communities",
            category: "Health",
            location: "Five regions of Cameroon",
            timeline: "July 2026 - June 2027",
            budget: "32,000,000 XAF",
            status: "REJECTED" as const,
            feedback: "The research methodology needs strengthening. Please revise the stigma measurement tools and include a control group in your study design. We encourage resubmission after revisions.",
            userIndex: 7,
        },
    ];

    for (const proj of projects) {
        const project = await prisma.project.create({
            data: {
                title: proj.title,
                description: proj.description,
                objectives: proj.objectives,
                category: proj.category,
                location: proj.location,
                timeline: proj.timeline,
                budget: proj.budget,
                status: proj.status,
                feedback: proj.feedback || null,
                userId: userIds[proj.userIndex],
                statusHistory: {
                    create: {
                        status: proj.status,
                        changedBy: userIds[0],
                        comment: `Project ${proj.status.toLowerCase().replace("_", " ")}`,
                    },
                },
            },
        });

        if (proj.status === "APPROVED" || proj.status === "REJECTED") {
            await prisma.projectStatusHistory.create({
                data: {
                    projectId: project.id,
                    status: "SUBMITTED",
                    changedBy: userIds[proj.userIndex],
                    comment: "Project submitted for review",
                    createdAt: new Date(baseDate.getTime() - 604800000),
                },
            });
        }
    }
    console.log(`✅ Created ${projects.length} projects`);

    // ─── 11. Create Notifications ──────────────────────────────
    console.log("🔔 Creating notifications...");

    const notifications = [
        { type: "PROJECT_STATUS" as const, message: 'Your project "Maternal Health Outcomes in Rural Far North Cameroon" has been approved!', link: "/projects", userIndex: 1, read: true },
        { type: "COMMENT" as const, message: "Jean-Pierre Nkomo commented on your post about sustainable farming.", link: "/feeds", userIndex: 6, read: false },
        { type: "LIKE" as const, message: "Paul Etienne Mbarga liked your post about inclusive education.", link: "/feeds", userIndex: 3, read: true },
        { type: "MENTION" as const, message: "Grace Ngono Fon mentioned you in a comment.", link: "/feeds", userIndex: 1, read: false },
        { type: "SYSTEM" as const, message: "Welcome to the CNEC platform! Complete your profile to get started.", link: "/update-profile", userIndex: 2, read: true },
        { type: "PROJECT_STATUS" as const, message: 'Your project "Digital Health Platform for Telemedicine Services" has been approved!', link: "/projects", userIndex: 5, read: true },
        { type: "COMMENT" as const, message: "Amina Bello replied to your comment on the ethics discussion.", link: "/community", userIndex: 4, read: false },
        { type: "MENTION" as const, message: "CNEC Admin mentioned you in a post about the Ethics Certification Program.", link: "/feeds", userIndex: 3, read: false },
        { type: "SYSTEM" as const, message: "New ethics guidelines have been published. Please review the updates.", link: "/community", userIndex: 4, read: false },
        { type: "PROJECT_STATUS" as const, message: 'Your project "Community Mental Health Awareness Campaign" needs revisions. Check the feedback.', link: "/projects", userIndex: 7, read: false },
        { type: "LIKE" as const, message: "Ibrahim Adamou and 3 others liked your post about climate change.", link: "/feeds", userIndex: 2, read: true },
        { type: "COMMENT" as const, message: "Samuel Tabi Egbe commented on your telemedicine post.", link: "/feeds", userIndex: 5, read: false },
        { type: "SYSTEM" as const, message: "Your profile has been updated successfully.", link: "/dashboard", userIndex: 8, read: true },
        { type: "PROJECT_STATUS" as const, message: 'A new project has been submitted: "AI-Powered Disease Surveillance System"', link: "/admin/project-review", userIndex: 0, read: false },
        { type: "MENTION" as const, message: "Amina Bello mentioned you in a community reply.", link: "/community", userIndex: 5, read: false },
    ];

    for (let i = 0; i < notifications.length; i++) {
        const n = notifications[i];
        await prisma.notification.create({
            data: {
                type: n.type,
                message: n.message,
                link: n.link,
                read: n.read,
                userId: userIds[n.userIndex],
                createdAt: new Date(baseDate.getTime() - i * 3600000),
            },
        });
    }
    console.log(`✅ Created ${notifications.length} notifications`);

    // ─── 12. Create Audit Logs ─────────────────────────────────
    console.log("📋 Creating audit logs...");

    const auditLogs = [
        { action: "PROJECT_APPROVED", details: "Approved project: Maternal Health Outcomes in Rural Far North Cameroon", targetId: null as string | null },
        { action: "PROJECT_APPROVED", details: "Approved project: Digital Health Platform for Telemedicine Services", targetId: null as string | null },
        { action: "PROJECT_APPROVED", details: "Approved project: Youth Digital Skills and Entrepreneurship Program", targetId: null as string | null },
        { action: "PROJECT_REJECTED", details: "Rejected project: Community Mental Health Awareness Campaign - methodology needs strengthening", targetId: null as string | null },
        { action: "USER_CREATED", details: "New user registered: Amina Bello (amina.bello@cnec.cm)", targetId: null as string | null },
        { action: "USER_CREATED", details: "New user registered: Jean-Pierre Nkomo (jp.nkomo@cnec.cm)", targetId: null as string | null },
        { action: "SYSTEM_UPDATE", details: "Updated ethics review guidelines", targetId: null as string | null },
        { action: "SYSTEM_UPDATE", details: "Published new data protection compliance checklist", targetId: null as string | null },
    ];

    for (let i = 0; i < auditLogs.length; i++) {
        const log = auditLogs[i];
        await prisma.auditLog.create({
            data: {
                action: log.action,
                details: log.details,
                targetId: log.targetId,
                userId: adminUserId,
                createdAt: new Date(baseDate.getTime() - i * 86400000),
            },
        });
    }
    console.log(`✅ Created ${auditLogs.length} audit logs`);

    // ─── 13. Create Reports ────────────────────────────────────
    console.log("🚩 Creating sample reports...");

    const reports = [
        { reason: "Potential misinformation about vaccine side effects", contentType: "POST" as const, contentId: createdPostIds[7] || randomUUID(), userIndex: 4, status: "PENDING" as const },
        { reason: "Off-topic content in the Ethics discussion channel", contentType: "TOPIC" as const, contentId: createdTopicIds[1] || randomUUID(), userIndex: 2, status: "REVIEWED" as const },
        { reason: "Spam content promoting unrelated services", contentType: "COMMENT" as const, contentId: createdCommentIds[5] || randomUUID(), userIndex: 0, status: "DISMISSED" as const },
    ];

    for (const report of reports) {
        await prisma.report.create({
            data: {
                reason: report.reason,
                contentType: report.contentType,
                contentId: report.contentId,
                userId: userIds[report.userIndex],
                status: report.status,
            },
        });
    }
    console.log(`✅ Created ${reports.length} reports`);

    console.log("\n🌱 Seeding complete!");
    console.log("\n📊 Summary:");
    console.log(`   👥 Users: ${userIds.length} (1 admin + ${prototypeUsers.length} users)`);
    console.log(`   📝 Posts: ${feedPosts.length}`);
    console.log(`   💬 Comments: ${comments.length} + ${replies.length} replies`);
    console.log(`   ❤️  Likes: ${likeCount} post likes + ${commentLikeCount} comment likes`);
    console.log(`   🏘️  Topics: ${communityTopics.length}`);
    console.log(`   💬 Replies: ${communityReplies.length}`);
    console.log(`   📂 Projects: ${projects.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log(`   📋 Audit Logs: ${auditLogs.length}`);
    console.log(`   🚩 Reports: ${reports.length}`);
    console.log(`\n   Default user password: User@CNEC2026`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
