/**
 * Database Seed Script
 * Generates mock data for SkillSwap development/demo
 * Run: npx tsx prisma/seed.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MAIN_USER_ID = 'cmrg3kvv50000gpxy8hdomvxk';

// Sri Lankan user profiles
const USERS = [
  { id: 'user_kasun', name: 'Kasun Perera', email: 'kasun@demo.com', bio: 'Passionate cook and yoga instructor from Colombo', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: 'user_nimali', name: 'Nimali Fernando', email: 'nimali@demo.com', bio: 'Fitness trainer and swimming coach based in Kandy', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
  { id: 'user_tharindu', name: 'Tharindu Silva', email: 'tharindu@demo.com', bio: 'Professional guitarist and music producer', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  { id: 'user_sachini', name: 'Sachini Dias', email: 'sachini@demo.com', bio: 'Graphic designer and watercolor artist from Galle', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200' },
  { id: 'user_lahiru', name: 'Lahiru Bandara', email: 'lahiru@demo.com', bio: 'DevOps engineer interested in cloud technologies', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
  { id: 'user_dilini', name: 'Dilini Jayawardena', email: 'dilini@demo.com', bio: 'Professional baker and cake decorator in Negombo', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' },
  { id: 'user_naveen', name: 'Naveen Rathnayake', email: 'naveen@demo.com', bio: 'Cricket coach and sports analyst', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' },
  { id: 'user_ishara', name: 'Ishara Weerasinghe', email: 'ishara@demo.com', bio: 'Yoga and meditation teacher from Matara', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200' },
  { id: 'user_chamara', name: 'Chamara Gunasekara', email: 'chamara@demo.com', bio: 'Mobile game streamer and community manager', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' },
  { id: 'user_rashmi', name: 'Rashmi Karunaratne', email: 'rashmi@demo.com', bio: 'Gym trainer and nutritionist from Colombo', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
  { id: 'user_dinesh', name: 'Dinesh Wickramasinghe', email: 'dinesh@demo.com', bio: 'Kubernetes specialist and cloud architect', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200' },
  { id: 'user_samantha', name: 'Samantha Wijesuriya', email: 'samantha@demo.com', bio: 'Traditional Sri Lankan cooking expert', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200' },
];

// Post images from Unsplash/Pexels
const POST_IMAGES = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
  'https://images.unsplash.com/photo-1461896836934-bd45ea8b2252?w=800',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
  'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
  'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?w=800',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?w=800',
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=800',
  'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
];

const POSTS_DATA = [
  { title: 'Getting started with Next.js App Router', content: 'The App Router in Next.js 14+ is a game changer. Server components reduce client JS significantly. Here are my top tips for migration...', hashtags: 'nextjs,react,webdev' },
  { title: 'My journey learning guitar in 6 months', content: 'Started from zero and now I can play basic chords and simple songs. Consistency is key — 20 minutes daily beats 2 hours weekly.', hashtags: 'guitar,music,learning' },
  { title: 'Best Sri Lankan rice and curry recipe', content: 'Nothing beats a home cooked rice and curry. The secret is in the spice roasting — dry roast your coriander, cumin and fennel before grinding.', hashtags: 'cooking,srilanka,food' },
  { title: 'Why Kubernetes matters for modern apps', content: 'Container orchestration simplified my deployment workflow. Auto-scaling, rolling updates, and self-healing — Kubernetes handles it all.', hashtags: 'kubernetes,devops,cloud' },
  { title: 'Morning yoga routine for beginners', content: 'Start with 5 sun salutations, hold each pose for 3 breaths. Your body will thank you after a week of consistent practice.', hashtags: 'yoga,fitness,wellness' },
  { title: 'PUBG Mobile tips for ranked matches', content: 'Drop strategy matters more than aim in ranked. Choose less contested zones, loot fast, rotate early with the circle.', hashtags: 'gaming,pubg,mobile' },
  { title: 'Postman collections for API testing', content: 'Organize your endpoints into collections, use environment variables, and write pre-request scripts. Saves hours of manual testing.', hashtags: 'postman,api,testing' },
  { title: 'Swimming technique for beginners', content: 'Focus on breathing first, not speed. Practice bilateral breathing in freestyle — it balances your stroke and builds endurance.', hashtags: 'swimming,fitness,sports' },
  { title: 'AWS basics every developer should know', content: 'Start with S3, EC2, and RDS. These three services cover 80% of common use cases. Then explore Lambda for serverless.', hashtags: 'aws,cloud,devops' },
  { title: 'How to make perfect hoppers at home', content: 'The batter needs to ferment overnight. Use a mix of rice flour and coconut milk. The wok should be smoking hot before you pour.', hashtags: 'cooking,srilanka,breakfast' },
  { title: 'Node.js performance optimization', content: 'Use clustering to utilize all CPU cores. Implement caching with Redis. Profile your app with clinic.js to find bottlenecks.', hashtags: 'nodejs,performance,backend' },
  { title: 'Cricket batting fundamentals', content: 'Keep your eyes level, watch the ball from the bowlers hand. Front foot movement should be towards the pitch of the ball.', hashtags: 'cricket,sports,coaching' },
  { title: 'Call of Duty Mobile loadout guide', content: 'The best ranked loadout: M13 with mono suppressor, no stock, and granulated grip. Fast ADS with great range.', hashtags: 'gaming,codm,mobile' },
  { title: 'Oracle Cloud free tier is underrated', content: 'Two free AMD compute instances, 200GB block storage, and always-free autonomous DB. Perfect for side projects and learning.', hashtags: 'oracle,cloud,free' },
  { title: 'Gym workout split for beginners', content: 'Push/Pull/Legs is the best split for beginners. 3 days a week with compound movements. Progressively overload each week.', hashtags: 'gym,fitness,workout' },
  { title: 'Teaching kids to code with Scratch', content: 'Visual programming removes the syntax barrier. Kids learn logic, loops and conditions through drag-and-drop blocks. Start at age 7-8.', hashtags: 'coding,education,kids' },
  { title: 'Meditation changed my productivity', content: '10 minutes of mindfulness every morning reduced my stress and improved focus at work. Use the breath as an anchor.', hashtags: 'meditation,productivity,mindfulness' },
  { title: 'Docker containers explained simply', content: 'Think of containers as lightweight VMs that share the host kernel. They package your app with all dependencies for consistent deployment.', hashtags: 'docker,devops,containers' },
  { title: 'Best beaches in Southern Sri Lanka', content: 'Unawatuna for swimming, Mirissa for whale watching, Hiriketiya for surfing. Each has a unique vibe worth experiencing.', hashtags: 'srilanka,travel,beaches' },
  { title: 'React hooks best practices', content: 'Keep hooks at the top level. Extract complex logic into custom hooks. Use useCallback and useMemo only when you have proven performance issues.', hashtags: 'react,hooks,javascript' },
  { title: 'How to brew great Ceylon tea', content: 'Use 1 teaspoon per cup plus one for the pot. Water should be just off the boil. Steep for 3-5 minutes depending on preference.', hashtags: 'tea,srilanka,beverages' },
  { title: 'TypeScript generics simplified', content: 'Generics let you write reusable code without losing type safety. Think of T as a placeholder for a type the caller decides.', hashtags: 'typescript,coding,webdev' },
  { title: 'Meal prep ideas for the week', content: 'Cook your proteins on Sunday, prep 5 portions of rice, and batch your vegetables. 2 hours saves 5 hours during the week.', hashtags: 'mealprep,cooking,health' },
  { title: 'Getting into competitive gaming', content: 'Aim trainers help, but game sense wins matches. Watch pro players, learn rotations, and review your own gameplay.', hashtags: 'gaming,esports,improvement' },
  { title: 'PostgreSQL query optimization', content: 'Always use EXPLAIN ANALYZE. Add indexes on frequently filtered columns. Avoid SELECT * — only fetch what you need.', hashtags: 'postgresql,database,performance' },
  { title: 'Surfing spots in Arugam Bay', content: 'April to October is the season. Main Point for experienced surfers, Whiskey Point and Peanut Farm for intermediates.', hashtags: 'surfing,srilanka,sports' },
  { title: 'REST API design principles', content: 'Use nouns not verbs in URLs. Return proper status codes. Version your API. Keep responses consistent and paginated.', hashtags: 'api,rest,backend' },
  { title: 'Home gardening in Sri Lanka', content: 'Start with herbs — curry leaves, lemongrass, pandan. They grow easily in our climate and you save money every week.', hashtags: 'gardening,srilanka,herbs' },
  { title: 'Socket.IO for real-time features', content: 'WebSocket connections stay open for bidirectional communication. Perfect for chat, notifications, and live updates.', hashtags: 'socketio,realtime,nodejs' },
  { title: 'Photography tips for beginners', content: 'Learn the rule of thirds first. Shoot during golden hour. Focus on composition before worrying about gear.', hashtags: 'photography,creative,tips' },
  { title: 'Prisma ORM best practices', content: 'Use transactions for multi-step operations. Add indexes in your schema for queried fields. Use select to minimize data transfer.', hashtags: 'prisma,database,nodejs' },
  { title: 'Traditional Kandyan dance', content: 'The ves dance is the most sacred form. Requires years of training. The costume alone weighs over 15kg with all the ornaments.', hashtags: 'dance,srilanka,culture' },
  { title: 'Git workflow for teams', content: 'Feature branches off develop, PR reviews required, squash merge to keep history clean. Tag releases from main.', hashtags: 'git,teamwork,devops' },
  { title: 'Egg hoppers masterclass', content: 'The trick is the right temperature and amount of batter. Crack the egg when the edges start firming. Cover for 1 minute.', hashtags: 'cooking,srilanka,hoppers' },
  { title: 'JWT authentication explained', content: 'JWTs are stateless tokens containing claims. The server signs them with a secret. Clients send them in headers for auth.', hashtags: 'jwt,auth,security' },
  { title: 'Indoor plants for your home office', content: 'Snake plants and pothos purify air and need minimal care. A bit of green reduces stress and boosts mood during work.', hashtags: 'plants,homeoffice,wellness' },
  { title: 'Tailwind CSS tips and tricks', content: 'Use the cn() utility for conditional classes. Extract repeated patterns into components rather than @apply. Group responsive variants.', hashtags: 'tailwind,css,frontend' },
  { title: 'Street food guide Colombo', content: 'Kottu from Hotel de Pilawoos, rolls from Perera and Sons, wade from any roadside vendor at 5pm. Budget eats at their best.', hashtags: 'food,colombo,streetfood' },
  { title: 'CI/CD with GitHub Actions', content: 'Automate tests on every PR, deploy on merge to main. Matrix builds for multiple Node versions. Cache dependencies for speed.', hashtags: 'cicd,github,automation' },
  { title: 'Mindful eating practices', content: 'Put your phone away during meals. Chew slowly, taste each bite. It improves digestion and helps you eat the right amount.', hashtags: 'mindfulness,health,eating' },
  { title: 'WebRTC for video calling', content: 'Peer-to-peer media streaming using ICE candidates and STUN/TURN servers. SFUs like LiveKit handle multi-party calls efficiently.', hashtags: 'webrtc,video,realtime' },
  { title: 'Hiking trails in Ella', content: 'Little Adams Peak for sunrise, Ella Rock for adventure, Nine Arches Bridge for photos. Start early to avoid the heat.', hashtags: 'hiking,srilanka,nature' },
  { title: 'Error handling in Express.js', content: 'Use async wrappers, create custom error classes, add a global error handler middleware. Always return appropriate HTTP status codes.', hashtags: 'express,nodejs,errorhandling' },
  { title: 'Smoothie recipes for post-workout', content: 'Banana, peanut butter, oats, milk, and a scoop of protein. Blend 30 seconds. 500 calories of clean recovery fuel.', hashtags: 'smoothie,fitness,nutrition' },
  { title: 'Deploying on Vercel', content: 'Connect your GitHub repo, set environment variables, push to main. Zero-config for Next.js. Preview deployments for every PR.', hashtags: 'vercel,deployment,nextjs' },
  { title: 'Learning a new language tips', content: 'Immersion beats textbooks. Watch content in your target language, use flashcards for vocab, speak from day one even if it is bad.', hashtags: 'languages,learning,selfimprovement' },
  { title: 'Redis for caching strategies', content: 'Cache database queries with TTL. Use pub/sub for real-time updates. Sorted sets for leaderboards. Simple key-value for sessions.', hashtags: 'redis,caching,performance' },
  { title: 'Weekend trip to Sigiriya', content: 'Start the climb by 7am before it gets hot. The mirror wall and frescoes halfway up are worth stopping for. Views from top are unreal.', hashtags: 'srilanka,travel,sigiriya' },
  { title: 'Building accessible web apps', content: 'Use semantic HTML, proper ARIA labels, keyboard navigation support. Test with screen readers. Contrast ratio matters.', hashtags: 'accessibility,webdev,ux' },
  { title: 'Dhal curry the right way', content: 'Red lentils, coconut milk, turmeric, pandan leaf, and a good tempered spice mix with mustard seeds, curry leaves and dried chili.', hashtags: 'cooking,srilanka,dhal' },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (order matters for foreign keys)
  await prisma.postComment.deleteMany();
  await prisma.commentLike.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.newsfeedPost.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.sessionCompletion.deleteMany();
  await prisma.session.deleteMany();
  await prisma.sessionRequest.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.aiChatMessage.deleteMany();
  await prisma.skillWant.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany({ where: { id: { in: USERS.map(u => u.id) } } });
  console.log('🧹 Cleaned existing seed data');

  const passwordHash = await bcrypt.hash('Demo@123', 12);

  // Create users
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        fullName: u.name,
        name: u.name,
        bio: u.bio,
        image: u.image,
        passwordHash,
        isVerified: true,
        timeZone: 'Asia/Colombo',
      },
    });
  }
  // Create wallets for seed users
  for (const u of USERS) {
    await prisma.wallet.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, availableBalance: 100, outgoingBalance: 0, incomingBalance: 0 },
    });
  }
  // Ensure main user has a wallet
  await prisma.wallet.upsert({
    where: { userId: MAIN_USER_ID },
    update: {},
    create: { userId: MAIN_USER_ID, availableBalance: 100, outgoingBalance: 0, incomingBalance: 0 },
  });
  console.log('✅ Users created');

  // Add skills for main user
  const mainSkillsTeach = [
    { name: 'Node.js', description: 'Backend development with Express, REST APIs, and microservices', proficiencyLevel: 'Advanced', yearsOfExperience: 4, teachingFormat: 'Online' },
    { name: 'Next.js', description: 'Full-stack React framework with App Router, SSR, and API routes', proficiencyLevel: 'Advanced', yearsOfExperience: 3, teachingFormat: 'Online' },
    { name: 'Postman', description: 'API testing, collections, environments, and automation scripts', proficiencyLevel: 'Intermediate', yearsOfExperience: 3, teachingFormat: 'Online' },
    { name: 'AWS Basics', description: 'EC2, S3, RDS, Lambda fundamentals for beginners', proficiencyLevel: 'Intermediate', yearsOfExperience: 2, teachingFormat: 'Online' },
    { name: 'Oracle Cloud', description: 'Always-free tier setup, compute instances, and autonomous DB', proficiencyLevel: 'Beginner', yearsOfExperience: 1, teachingFormat: 'Online' },
    { name: 'Cricket', description: 'Batting techniques, bowling basics, and fielding positions', proficiencyLevel: 'Intermediate', yearsOfExperience: 8, teachingFormat: 'In Person' },
    { name: 'PUBG Mobile', description: 'Ranked strategies, map rotations, and squad communication', proficiencyLevel: 'Advanced', yearsOfExperience: 3, teachingFormat: 'Online' },
    { name: 'Call of Duty Mobile', description: 'Loadout optimization, movement mechanics, and ranked tips', proficiencyLevel: 'Intermediate', yearsOfExperience: 2, teachingFormat: 'Online' },
  ];

  for (const skill of mainSkillsTeach) {
    await prisma.skill.create({
      data: { ownerId: MAIN_USER_ID, ...skill, isTeaching: true, availabilityWindow: '18:00-22:00', timeZone: 'Asia/Colombo' },
    });
  }

  // Skills main user wants to learn
  const mainSkillsWant = [
    { name: 'Kubernetes', description: 'Container orchestration, deployments, and cluster management', proficiencyTarget: 'Intermediate' },
    { name: 'Guitar', description: 'Want to learn acoustic guitar from scratch — chords and simple songs', proficiencyTarget: 'Beginner' },
    { name: 'Swimming', description: 'Learn freestyle and backstroke properly with breathing technique', proficiencyTarget: 'Beginner' },
  ];

  for (const skill of mainSkillsWant) {
    await prisma.skillWant.create({ data: { userId: MAIN_USER_ID, ...skill } });
  }

  // Add skills for other users
  const otherSkills = [
    { userId: 'user_kasun', skills: [{ name: 'Sri Lankan Cooking', desc: 'Traditional rice and curry, hoppers, kottu' }, { name: 'Yoga', desc: 'Hatha and Vinyasa flow for all levels' }] },
    { userId: 'user_nimali', skills: [{ name: 'Swimming', desc: 'Freestyle, backstroke, and water confidence' }, { name: 'Fitness Training', desc: 'Weight training and cardio programs' }] },
    { userId: 'user_tharindu', skills: [{ name: 'Guitar', desc: 'Acoustic and electric guitar, chords to lead' }, { name: 'Music Production', desc: 'FL Studio and Ableton basics' }] },
    { userId: 'user_sachini', skills: [{ name: 'Graphic Design', desc: 'Figma, Photoshop, brand identity design' }, { name: 'Watercolor Painting', desc: 'Landscapes and botanical illustration' }] },
    { userId: 'user_lahiru', skills: [{ name: 'Kubernetes', desc: 'K8s clusters, Helm charts, CI/CD pipelines' }, { name: 'Docker', desc: 'Containerization and multi-stage builds' }] },
    { userId: 'user_dilini', skills: [{ name: 'Baking', desc: 'Cakes, pastries, bread from scratch' }, { name: 'Cake Decorating', desc: 'Fondant work and piping techniques' }] },
    { userId: 'user_naveen', skills: [{ name: 'Cricket Coaching', desc: 'Batting, bowling, and match strategy' }, { name: 'Sports Analytics', desc: 'Performance data analysis' }] },
    { userId: 'user_ishara', skills: [{ name: 'Meditation', desc: 'Mindfulness and breath-based meditation' }, { name: 'Yoga', desc: 'Ashtanga and restorative yoga' }] },
    { userId: 'user_chamara', skills: [{ name: 'PUBG Mobile', desc: 'Pro-level strategies and team coordination' }, { name: 'Game Streaming', desc: 'OBS setup and audience engagement' }] },
    { userId: 'user_rashmi', skills: [{ name: 'Gym Training', desc: 'Strength training and body composition' }, { name: 'Nutrition Planning', desc: 'Macro counting and meal plans' }] },
    { userId: 'user_dinesh', skills: [{ name: 'Kubernetes', desc: 'Production K8s, monitoring, and scaling' }, { name: 'AWS', desc: 'Solutions architect level knowledge' }] },
    { userId: 'user_samantha', skills: [{ name: 'Traditional Cooking', desc: 'Authentic village-style Sri Lankan food' }, { name: 'Spice Blending', desc: 'Custom curry powder recipes' }] },
  ];

  for (const u of otherSkills) {
    for (const s of u.skills) {
      await prisma.skill.create({
        data: { ownerId: u.userId, name: s.name, description: s.desc, proficiencyLevel: 'Advanced', yearsOfExperience: 3, teachingFormat: 'Online', isTeaching: true, availabilityWindow: '09:00-17:00', timeZone: 'Asia/Colombo' },
      });
    }
  }
  console.log('✅ Skills created');

  // Connections — active (main user sent, cost 5 credits each)
  const activeConnections = ['user_kasun', 'user_nimali', 'user_tharindu', 'user_lahiru', 'user_naveen'];
  for (const otherId of activeConnections) {
    const [u1, u2] = MAIN_USER_ID < otherId ? [MAIN_USER_ID, otherId] : [otherId, MAIN_USER_ID];
    await prisma.connection.upsert({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      update: {},
      create: { user1Id: u1, user2Id: u2, status: 'ACTIVE' },
    });
  }

  // Incoming connection requests (others sent to main user)
  for (const senderId of ['user_dilini', 'user_ishara', 'user_rashmi']) {
    await prisma.connectionRequest.create({
      data: { senderId, receiverId: MAIN_USER_ID, status: 'PENDING', creditsHeld: 5 },
    });
  }

  // Outgoing connection requests (main user sent)
  for (const receiverId of ['user_chamara', 'user_dinesh']) {
    await prisma.connectionRequest.create({
      data: { senderId: MAIN_USER_ID, receiverId, status: 'PENDING', creditsHeld: 5 },
    });
  }

  // Blocked users
  await prisma.blockedUser.create({ data: { blockerId: MAIN_USER_ID, blockedId: 'user_samantha' } });

  // Update main user wallet (100 - 5*5 outgoing for active connections - 5*2 for pending sent = 65)
  await prisma.wallet.update({
    where: { userId: MAIN_USER_ID },
    data: { availableBalance: 65, outgoingBalance: 10 },
  });
  console.log('✅ Connections created');

  // Sessions
  const connKasun = await prisma.connection.findFirst({ where: { OR: [{ user1Id: MAIN_USER_ID, user2Id: 'user_kasun' }, { user1Id: 'user_kasun', user2Id: MAIN_USER_ID }] } });
  const connNimali = await prisma.connection.findFirst({ where: { OR: [{ user1Id: MAIN_USER_ID, user2Id: 'user_nimali' }, { user1Id: 'user_nimali', user2Id: MAIN_USER_ID }] } });
  const connTharindu = await prisma.connection.findFirst({ where: { OR: [{ user1Id: MAIN_USER_ID, user2Id: 'user_tharindu' }, { user1Id: 'user_tharindu', user2Id: MAIN_USER_ID }] } });
  const connLahiru = await prisma.connection.findFirst({ where: { OR: [{ user1Id: MAIN_USER_ID, user2Id: 'user_lahiru' }, { user1Id: 'user_lahiru', user2Id: MAIN_USER_ID }] } });

  // Get skills for sessions
  const k8sSkill = await prisma.skill.findFirst({ where: { ownerId: 'user_lahiru', name: 'Kubernetes' } });
  const cookSkill = await prisma.skill.findFirst({ where: { ownerId: 'user_kasun', name: 'Sri Lankan Cooking' } });
  const guitarSkill = await prisma.skill.findFirst({ where: { ownerId: 'user_tharindu', name: 'Guitar' } });
  const swimSkill = await prisma.skill.findFirst({ where: { ownerId: 'user_nimali', name: 'Swimming' } });

  // Active session
  await prisma.session.create({
    data: { learner: { connect: { id: MAIN_USER_ID } }, provider: { connect: { id: 'user_lahiru' } }, skill: { connect: { id: k8sSkill!.id } }, connection: { connect: { id: connLahiru!.id } }, sessionName: 'Kubernetes Fundamentals', description: 'Learning K8s basics', mode: 'ONLINE', startDate: new Date('2026-07-15'), endDate: new Date('2026-07-15'), status: 'ACTIVE', sessionCredits: 20, learnerCompletionConfirmed: false, providerCompletionConfirmed: false },
  });

  // Completed session
  const completedSession = await prisma.session.create({
    data: { learner: { connect: { id: MAIN_USER_ID } }, provider: { connect: { id: 'user_kasun' } }, skill: { connect: { id: cookSkill!.id } }, connection: { connect: { id: connKasun!.id } }, sessionName: 'Sri Lankan Cooking Basics', description: 'Learned rice and curry', mode: 'ONLINE', startDate: new Date('2026-06-20'), endDate: new Date('2026-06-20'), status: 'COMPLETED', sessionCredits: 15, learnerCompletionConfirmed: true, providerCompletionConfirmed: true, completedAt: new Date('2026-06-20') },
  });

  // Cancelled session
  await prisma.session.create({
    data: { learner: { connect: { id: MAIN_USER_ID } }, provider: { connect: { id: 'user_tharindu' } }, skill: { connect: { id: guitarSkill!.id } }, connection: { connect: { id: connTharindu!.id } }, sessionName: 'Guitar Intro', description: 'Basic chords', mode: 'ONLINE', startDate: new Date('2026-06-10'), endDate: new Date('2026-06-10'), status: 'CANCELLED', sessionCredits: 10, learnerCompletionConfirmed: false, providerCompletionConfirmed: false, cancelledAt: new Date('2026-06-09'), cancelReason: 'Schedule conflict' },
  });

  // Declined session request
  await prisma.sessionRequest.create({
    data: { senderId: MAIN_USER_ID, receiverId: 'user_nimali', skillId: swimSkill!.id, sessionName: 'Swimming Lessons', description: 'Learn freestyle', mode: 'ONLINE', startDate: new Date('2026-07-01'), endDate: new Date('2026-07-01'), creditsHeld: 5, sessionCredits: 20, status: 'DECLINED' },
  });

  // Review for completed session
  await prisma.review.create({
    data: { session: { connect: { id: completedSession.id } }, reviewedBy: { connect: { id: MAIN_USER_ID } }, reviewedUser: { connect: { id: 'user_kasun' } }, skill: { connect: { id: cookSkill!.id } }, rating: 5, comments: 'Amazing teacher! The curry turned out perfectly. Very patient and explained each step clearly.', teachingClarity: 5, responsiveness: 5, reliability: 5, punctuality: 5 },
  });
  console.log('✅ Sessions created');

  // Credit transactions
  const mainWallet = await prisma.wallet.findUnique({ where: { userId: MAIN_USER_ID } });
  if (mainWallet) {
    const txns = [
      { amount: 100, type: 'INITIAL_ALLOCATION', status: 'COMPLETED', note: 'Welcome bonus credits' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'COMPLETED', relatedUserId: 'user_kasun', note: 'Connection request to Kasun' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'COMPLETED', relatedUserId: 'user_nimali', note: 'Connection request to Nimali' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'COMPLETED', relatedUserId: 'user_tharindu', note: 'Connection request to Tharindu' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'COMPLETED', relatedUserId: 'user_lahiru', note: 'Connection request to Lahiru' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'COMPLETED', relatedUserId: 'user_naveen', note: 'Connection request to Naveen' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'PENDING', relatedUserId: 'user_chamara', note: 'Connection request to Chamara' },
      { amount: -5, type: 'CONNECTION_REQUEST_SENT', status: 'PENDING', relatedUserId: 'user_dinesh', note: 'Connection request to Dinesh' },
      { amount: 5, type: 'CONNECTION_REQUEST_RECEIVED', status: 'COMPLETED', relatedUserId: 'user_dilini', note: 'Accepted connection from Dilini' },
      { amount: -15, type: 'SESSION_COMPLETED', status: 'COMPLETED', relatedUserId: 'user_kasun', note: 'Session completed: Sri Lankan Cooking' },
    ];
    for (const tx of txns) {
      await prisma.transaction.create({
        data: { walletId: mainWallet.id, amount: tx.amount, type: tx.type, status: tx.status, relatedUserId: tx.relatedUserId || null, note: tx.note },
      });
    }
  }
  console.log('✅ Transactions created');

  // Messages (casual chat with connected users)
  if (connKasun) {
    const msgs = [
      { senderId: MAIN_USER_ID, receiverId: 'user_kasun', content: 'Hey Kasun! Thanks for accepting my connection request' },
      { senderId: 'user_kasun', receiverId: MAIN_USER_ID, content: 'No problem! Happy to connect. I saw you want to learn cooking?' },
      { senderId: MAIN_USER_ID, receiverId: 'user_kasun', content: 'Yes! I really want to learn how to make proper rice and curry' },
      { senderId: 'user_kasun', receiverId: MAIN_USER_ID, content: 'I can definitely help with that. Should we schedule a session?' },
      { senderId: MAIN_USER_ID, receiverId: 'user_kasun', content: 'That would be great. Are you free this weekend?' },
      { senderId: 'user_kasun', receiverId: MAIN_USER_ID, content: 'Saturday afternoon works for me. Lets do 2pm?' },
      { senderId: MAIN_USER_ID, receiverId: 'user_kasun', content: 'Perfect, Ill send you a session request now' },
    ];
    for (let i = 0; i < msgs.length; i++) {
      await prisma.message.create({
        data: { connectionId: connKasun.id, ...msgs[i], isRead: true, createdAt: new Date(Date.now() - (msgs.length - i) * 3600000) },
      });
    }
  }

  if (connLahiru) {
    const msgs = [
      { senderId: 'user_lahiru', receiverId: MAIN_USER_ID, content: 'Hi! I noticed you want to learn Kubernetes. I work with it daily' },
      { senderId: MAIN_USER_ID, receiverId: 'user_lahiru', content: 'Oh nice! Yes I really need to learn K8s for work' },
      { senderId: 'user_lahiru', receiverId: MAIN_USER_ID, content: 'Ill start with the basics — pods, services, deployments. Then we can move to Helm' },
      { senderId: MAIN_USER_ID, receiverId: 'user_lahiru', content: 'Sounds like a solid plan. I already know Docker so that should help' },
      { senderId: 'user_lahiru', receiverId: MAIN_USER_ID, content: 'Yeah Docker knowledge is a great foundation. Lets start next week' },
      { senderId: MAIN_USER_ID, receiverId: 'user_lahiru', content: 'Cant wait. Thanks for the help!' },
    ];
    for (let i = 0; i < msgs.length; i++) {
      await prisma.message.create({
        data: { connectionId: connLahiru.id, ...msgs[i], isRead: true, createdAt: new Date(Date.now() - (msgs.length - i) * 7200000) },
      });
    }
  }

  if (connNimali) {
    const msgs = [
      { senderId: MAIN_USER_ID, receiverId: 'user_nimali', content: 'Hi Nimali! Are you still offering swimming lessons?' },
      { senderId: 'user_nimali', receiverId: MAIN_USER_ID, content: 'Hey! Yes I am. I teach at the pool near Kandy lake' },
      { senderId: MAIN_USER_ID, receiverId: 'user_nimali', content: 'I cant really swim well, would you take a complete beginner?' },
      { senderId: 'user_nimali', receiverId: MAIN_USER_ID, content: 'Of course! Most of my students start from zero. We focus on water confidence first' },
    ];
    for (let i = 0; i < msgs.length; i++) {
      await prisma.message.create({
        data: { connectionId: connNimali.id, ...msgs[i], isRead: true, createdAt: new Date(Date.now() - (msgs.length - i) * 86400000) },
      });
    }
  }
  console.log('✅ Messages created');

  // Newsfeed Posts (50 posts from various users with images)
  const allUserIds = [MAIN_USER_ID, ...USERS.map(u => u.id)];

  for (let i = 0; i < POSTS_DATA.length; i++) {
    const post = POSTS_DATA[i];
    const authorId = allUserIds[i % allUserIds.length];
    const hasImage = i < POST_IMAGES.length;

    const createdPost = await prisma.newsfeedPost.create({
      data: {
        authorId,
        title: post.title,
        content: post.content,
        hashtags: post.hashtags,
        mediaUrl: hasImage ? POST_IMAGES[i % POST_IMAGES.length] : null,
        viewCount: Math.floor(Math.random() * 200) + 10,
        createdAt: new Date(Date.now() - i * 4 * 3600000),
      },
    });

    // Add 2-5 likes per post
    const likerCount = Math.floor(Math.random() * 4) + 2;
    const shuffled = [...allUserIds].sort(() => Math.random() - 0.5);
    for (let j = 0; j < likerCount && j < shuffled.length; j++) {
      if (shuffled[j] !== authorId) {
        await prisma.postLike.create({
          data: { postId: createdPost.id, userId: shuffled[j] },
        }).catch(() => {});
      }
    }

    // Add 1-3 comments per post
    const commentCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < commentCount; j++) {
      const commenterId = shuffled[(j + likerCount) % shuffled.length];
      if (commenterId === authorId) continue;

      const comments = [
        'Great post! Really helpful tips.',
        'Thanks for sharing this!',
        'I needed this today.',
        'Solid advice, bookmarking this.',
        'Can you explain more about this?',
        'This is exactly what I was looking for.',
        'Nice work!',
        'Very informative.',
        'Love the practical approach.',
        'Keep sharing content like this!',
      ];

      const comment = await prisma.postComment.create({
        data: {
          postId: createdPost.id,
          commenterId,
          content: comments[Math.floor(Math.random() * comments.length)],
          createdAt: new Date(Date.now() - i * 4 * 3600000 + (j + 1) * 1800000),
        },
      });

      // Add a reply to some comments
      if (j === 0 && Math.random() > 0.5) {
        const replierId = authorId;
        const replies = ['Thanks! Glad it helped.', 'Happy to share!', 'Let me know if you have questions.', 'Appreciate the feedback!'];
        await prisma.postComment.create({
          data: {
            postId: createdPost.id,
            commenterId: replierId,
            parentId: comment.id,
            content: replies[Math.floor(Math.random() * replies.length)],
            createdAt: new Date(Date.now() - i * 4 * 3600000 + (j + 2) * 1800000),
          },
        });
      }
    }
  }
  console.log('✅ 50 Newsfeed posts with comments and likes created');

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: MAIN_USER_ID, type: 'CONNECTION_REQUEST', title: 'New connection request', message: 'Dilini Jayawardena sent you a connection request.', relatedUserId: 'user_dilini' },
      { userId: MAIN_USER_ID, type: 'CONNECTION_REQUEST', title: 'New connection request', message: 'Ishara Weerasinghe sent you a connection request.', relatedUserId: 'user_ishara' },
      { userId: MAIN_USER_ID, type: 'CONNECTION_REQUEST', title: 'New connection request', message: 'Rashmi Karunaratne sent you a connection request.', relatedUserId: 'user_rashmi' },
      { userId: MAIN_USER_ID, type: 'POST_LIKE', title: 'Someone liked your post', message: 'Kasun Perera liked your post.', relatedUserId: 'user_kasun' },
      { userId: MAIN_USER_ID, type: 'POST_COMMENT', title: 'New comment on your post', message: 'Nimali Fernando commented on your post.', relatedUserId: 'user_nimali' },
    ],
  });
  console.log('✅ Notifications created');

  // Set admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'theodoreleo509@gmail.com' },
  });
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { isAdmin: true },
    });
    console.log('✅ Admin user configured: theodoreleo509@gmail.com');
  } else {
    console.log('⚠️  Admin user theodoreleo509@gmail.com not found — register first, then re-run seed');
  }

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
