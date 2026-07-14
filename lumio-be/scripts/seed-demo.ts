import { CourseLevel, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

// Fixed so lumio-fe can point NEXT_PUBLIC_TENANT_ID at a stable id across `docker compose up`
// runs — see lumio-fe/.env.example and TenantContextMiddleware's `x-tenant-id` dev path.
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'password123';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

interface LectureSpec {
  title: string;
  minutes: number;
  preview?: boolean;
}
interface SectionSpec {
  title: string;
  lectures: LectureSpec[];
}
interface InstructorSpec {
  email: string;
  name: string;
}
interface CourseSpec {
  title: string;
  category: string;
  level: CourseLevel;
  priceCents: number;
  shortDesc: string;
  longDesc: string;
  outcomes: string[];
  instructor: InstructorSpec;
  sections: SectionSpec[];
}

const CATEGORIES = [
  'Web Development',
  'Design',
  'Data Science',
  'Photography',
  'Video & Motion',
  'Illustration',
];

const COURSES: CourseSpec[] = [
  {
    title: 'Modern JavaScript: From Zero to Expert',
    category: 'Web Development',
    level: 'ALL_LEVELS',
    priceCents: 8499,
    shortDesc: 'Master the language that runs the web, one project at a time.',
    longDesc:
      'This course is built around real, finished projects — not disconnected exercises. ' +
      'You will work through each concept hands-on, with downloadable resources, checkpoints, ' +
      'and a supportive Q&A community. By the end you will have work you are proud to show, ' +
      'and the confidence to keep going on your own.',
    outcomes: [
      'Write clean, modern JavaScript with confidence',
      'Build interactive interfaces from scratch',
      'Work with APIs and handle asynchronous data',
      'Structure and deploy a real production app',
      'Debug effectively instead of guessing',
    ],
    instructor: { email: 'sarah.chen@lumio.dev', name: 'Sarah Chen' },
    sections: [
      {
        title: 'Getting Started',
        lectures: [
          { title: 'Course Introduction & Setup', minutes: 6, preview: true },
          { title: 'How the Web Actually Works', minutes: 9, preview: true },
          { title: 'Your Dev Environment', minutes: 7 },
          { title: 'Reading Docs Like a Pro', minutes: 5 },
        ],
      },
      {
        title: 'Core Language',
        lectures: [
          { title: 'Variables, Types & Operators', minutes: 11 },
          { title: 'Functions & Scope', minutes: 14 },
          { title: 'Arrays & Objects', minutes: 12 },
          { title: 'Control Flow & Loops', minutes: 9 },
        ],
      },
      {
        title: 'Working with the DOM',
        lectures: [
          { title: 'Selecting & Manipulating Elements', minutes: 10 },
          { title: 'Events & Listeners', minutes: 8 },
          { title: 'Fetching Data from APIs', minutes: 15 },
          { title: 'Build a Real Project', minutes: 22 },
        ],
      },
    ],
  },
  {
    title: 'UI/UX Design Masterclass: Figma to Prototype',
    category: 'Design',
    level: 'ALL_LEVELS',
    priceCents: 9499,
    shortDesc: 'Design beautiful, usable products and prototype them end to end.',
    longDesc:
      'A hands-on path from blank canvas to a polished, interactive prototype. You will build a ' +
      'real design system, apply color and typography intentionally, and hand off cleanly to ' +
      'developers — everything a working product designer does day to day.',
    outcomes: [
      'Design polished interfaces in Figma',
      'Apply color, type, and layout intentionally',
      'Build and maintain a scalable design system',
      'Create interactive, testable prototypes',
      'Hand off cleanly to developers',
    ],
    instructor: { email: 'marcus.webb@lumio.dev', name: 'Marcus Webb' },
    sections: [
      {
        title: 'Design Foundations',
        lectures: [
          { title: 'Welcome to the Course', minutes: 5, preview: true },
          { title: 'Principles of Visual Design', minutes: 12, preview: true },
          { title: 'Color Theory in Practice', minutes: 10 },
          { title: 'Typography Essentials', minutes: 9 },
        ],
      },
      {
        title: 'Working in Figma',
        lectures: [
          { title: 'The Figma Interface', minutes: 8 },
          { title: 'Frames, Layers & Components', minutes: 14 },
          { title: 'Auto Layout Mastery', minutes: 16 },
          { title: 'Styles & Variables', minutes: 11 },
        ],
      },
      {
        title: 'Prototyping & Handoff',
        lectures: [
          { title: 'Interactive Prototypes', minutes: 13 },
          { title: 'Smart Animate', minutes: 9 },
          { title: 'Developer Handoff', minutes: 7 },
          { title: 'Usability Testing', minutes: 12 },
        ],
      },
    ],
  },
  {
    title: 'Python for Data Science & Machine Learning',
    category: 'Data Science',
    level: 'BEGINNER',
    priceCents: 8999,
    shortDesc: 'Go from spreadsheets to trained models with real datasets.',
    longDesc:
      'Learn to wrangle, explore, and visualize data with Pandas and NumPy, then train and ' +
      'evaluate your first machine learning models. Every module uses real, messy datasets — ' +
      'not toy problems — so what you learn transfers directly to the job.',
    outcomes: [
      'Manipulate data fluently with Pandas & NumPy',
      'Explore and visualize datasets effectively',
      'Train and evaluate machine learning models',
      'Clean and prepare messy real-world data',
      'Communicate insights to non-technical people',
    ],
    instructor: { email: 'aisha.rahman@lumio.dev', name: 'Dr. Aisha Rahman' },
    sections: [
      {
        title: 'Foundations',
        lectures: [
          { title: 'Course Overview', minutes: 5, preview: true },
          { title: 'Setting Up Python & Jupyter', minutes: 8, preview: true },
          { title: 'NumPy Fundamentals', minutes: 13 },
          { title: 'Pandas for Data Wrangling', minutes: 16 },
        ],
      },
      {
        title: 'Exploring Data',
        lectures: [
          { title: 'Cleaning Messy Data', minutes: 14 },
          { title: 'Exploratory Data Analysis', minutes: 12 },
          { title: 'Data Visualization', minutes: 11 },
          { title: 'Statistics Refresher', minutes: 10 },
        ],
      },
      {
        title: 'Machine Learning',
        lectures: [
          { title: 'Intro to Machine Learning', minutes: 15 },
          { title: 'Regression Models', minutes: 17 },
          { title: 'Classification', minutes: 16 },
          { title: 'Evaluating Your Model', minutes: 12 },
        ],
      },
    ],
  },
  {
    title: 'Photography Foundations: Light, Composition & Story',
    category: 'Photography',
    level: 'BEGINNER',
    priceCents: 7499,
    shortDesc: 'Stop shooting on auto and start making intentional images.',
    longDesc:
      'A practical foundation in exposure, light, and composition. You will shoot every lesson, ' +
      'not just watch — building the instincts that separate a snapshot from a photograph you ' +
      'actually want to print.',
    outcomes: [
      'Shoot confidently in full manual mode',
      'Read and shape light in any situation',
      'Compose images that tell a story',
      'Direct and pose people naturally',
      'Edit a cohesive, professional workflow',
    ],
    instructor: { email: 'nina.kohler@lumio.dev', name: 'Nina Köhler' },
    sections: [
      {
        title: 'Camera & Light',
        lectures: [
          { title: 'Welcome & Gear Overview', minutes: 6, preview: true },
          { title: 'Understanding Exposure', minutes: 11, preview: true },
          { title: 'Aperture, Shutter & ISO', minutes: 13 },
          { title: 'Reading Natural Light', minutes: 10 },
        ],
      },
      {
        title: 'Composition',
        lectures: [
          { title: 'The Rule of Thirds & Beyond', minutes: 9 },
          { title: 'Leading Lines & Framing', minutes: 8 },
          { title: 'Telling a Story in a Frame', minutes: 12 },
          { title: 'Shooting on Location', minutes: 14 },
        ],
      },
      {
        title: 'Editing',
        lectures: [
          { title: 'Lightroom Workflow', minutes: 15 },
          { title: 'Color Grading', minutes: 12 },
          { title: 'Retouching Basics', minutes: 10 },
          { title: 'Exporting for Print & Web', minutes: 6 },
        ],
      },
    ],
  },
  {
    title: 'Cinematic Video Editing with DaVinci Resolve',
    category: 'Video & Motion',
    level: 'INTERMEDIATE',
    priceCents: 7999,
    shortDesc: 'Cut, color, and finish videos that look truly cinematic.',
    longDesc:
      'Learn a real editorial workflow from import to final export: pacing a cut for story, ' +
      'grading for mood, and finishing with clean audio and titles. Built entirely around a ' +
      'DaVinci Resolve project you take from raw footage to finished film.',
    outcomes: [
      'Edit a compelling story from raw footage',
      'Apply cinematic color grades',
      'Mix clean, balanced audio',
      'Create motion graphics and titles',
      'Export optimized files for any platform',
    ],
    instructor: { email: 'leo.martins@lumio.dev', name: 'Leo Martins' },
    sections: [
      {
        title: 'Getting Started',
        lectures: [
          { title: 'Welcome & Workspace Tour', minutes: 7, preview: true },
          { title: 'Importing & Organizing Media', minutes: 9, preview: true },
          { title: 'Timeline Basics', minutes: 11 },
          { title: 'Cuts & Pacing', minutes: 13 },
        ],
      },
      {
        title: 'The Edit',
        lectures: [
          { title: 'Storytelling Through Editing', minutes: 14 },
          { title: 'Transitions That Work', minutes: 8 },
          { title: 'Working with Audio', minutes: 12 },
          { title: 'Titles & Lower Thirds', minutes: 9 },
        ],
      },
      {
        title: 'Color & Finishing',
        lectures: [
          { title: 'Color Correction', minutes: 13 },
          { title: 'Cinematic Color Grading', minutes: 16 },
          { title: 'Sound Design', minutes: 10 },
          { title: 'Export Settings', minutes: 6 },
        ],
      },
    ],
  },
  {
    title: 'Digital Illustration with Procreate',
    category: 'Illustration',
    level: 'ALL_LEVELS',
    priceCents: 6999,
    shortDesc: 'Draw, render, and develop a style that is truly yours.',
    longDesc:
      'From brush basics to a finished showcase piece, this course builds real drawing fundamentals ' +
      'alongside a fast, professional Procreate workflow — so you leave with both stronger ' +
      'fundamentals and work worth sharing.',
    outcomes: [
      'Draw confidently from sketch to finish',
      'Master Procreate brushes and layers',
      'Render light, shadow, and texture',
      'Design characters and full scenes',
      'Develop a recognizable personal style',
    ],
    instructor: { email: 'yuki.tanaka@lumio.dev', name: 'Yuki Tanaka' },
    sections: [
      {
        title: 'Getting Started',
        lectures: [
          { title: 'Welcome & Procreate Tour', minutes: 6, preview: true },
          { title: 'Brushes & Gestures', minutes: 9, preview: true },
          { title: 'Layers & Blend Modes', minutes: 11 },
          { title: 'Color & Palettes', minutes: 8 },
        ],
      },
      {
        title: 'Drawing Fundamentals',
        lectures: [
          { title: 'Sketching with Confidence', minutes: 12 },
          { title: 'Line Work & Inking', minutes: 10 },
          { title: 'Light & Shadow', minutes: 13 },
          { title: 'Perspective Basics', minutes: 11 },
        ],
      },
      {
        title: 'Showcase Project',
        lectures: [
          { title: 'The Final Piece', minutes: 18 },
          { title: 'Composition & Story', minutes: 9 },
          { title: 'Sharing Your Work', minutes: 5 },
        ],
      },
    ],
  },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'Lumio Academy',
      subdomain: 'lumio',
      status: 'ACTIVE',
    },
  });
  console.log(`Tenant ready: ${tenant.name} (${tenant.id})`);

  const categoryByName = new Map<string, string>();
  for (const name of CATEGORIES) {
    const slug = slugify(name);
    const category = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: { name },
      create: { tenantId: tenant.id, name, slug },
    });
    categoryByName.set(name, category.id);
  }
  console.log(`Seeded ${categoryByName.size} categories.`);

  const instructorIdByEmail = new Map<string, string>();
  for (const spec of COURSES) {
    const { email, name } = spec.instructor;
    if (instructorIdByEmail.has(email)) continue;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS),
          emailVerifiedAt: new Date(),
        },
      });
    }
    await prisma.membership.upsert({
      where: { userId_tenantId_role: { userId: user.id, tenantId: tenant.id, role: 'INSTRUCTOR' } },
      update: { status: 'ACTIVE' },
      create: { userId: user.id, tenantId: tenant.id, role: 'INSTRUCTOR' },
    });
    instructorIdByEmail.set(email, user.id);
  }
  console.log(`Seeded ${instructorIdByEmail.size} instructors (password: ${DEMO_PASSWORD}).`);

  for (const spec of COURSES) {
    const slug = slugify(spec.title);
    const instructorId = instructorIdByEmail.get(spec.instructor.email)!;
    const categoryId = categoryByName.get(spec.category)!;

    const course = await prisma.course.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: {
        shortDesc: spec.shortDesc,
        longDesc: spec.longDesc,
        outcomes: spec.outcomes,
        level: spec.level,
        priceCents: spec.priceCents,
        categoryId,
        status: 'PUBLISHED',
      },
      create: {
        tenantId: tenant.id,
        instructorId,
        categoryId,
        title: spec.title,
        slug,
        shortDesc: spec.shortDesc,
        longDesc: spec.longDesc,
        outcomes: spec.outcomes,
        level: spec.level,
        priceCents: spec.priceCents,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Re-created fresh each run (cascades to lectures) — simplest way to keep a demo seed
    // idempotent without diffing section/lecture trees.
    await prisma.courseSection.deleteMany({ where: { courseId: course.id } });

    for (const [sectionIndex, sectionSpec] of spec.sections.entries()) {
      const section = await prisma.courseSection.create({
        data: { courseId: course.id, title: sectionSpec.title, position: sectionIndex },
      });
      for (const [lectureIndex, lectureSpec] of sectionSpec.lectures.entries()) {
        await prisma.lecture.create({
          data: {
            sectionId: section.id,
            title: lectureSpec.title,
            position: lectureIndex,
            durationSeconds: lectureSpec.minutes * 60,
            isPreview: lectureSpec.preview ?? false,
          },
        });
      }
    }
    console.log(`Seeded course: ${spec.title}`);
  }

  console.log('\nDemo seed complete.');
  console.log(`Tenant id for lumio-fe's NEXT_PUBLIC_TENANT_ID: ${tenant.id}`);
  console.log(`All instructor accounts share the password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
