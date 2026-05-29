import { Role } from "../src/models/role.model.js";
import connectDB from "../src/db/index.js";

const roles = [
  {
    name: "Software Engineer",
    slug: "software-engineer",
    icon_emoji: "👨‍💻",
    description: "Build scalable, maintainable software systems with strong coding practices and system design skills.",
  },
  {
    name: "Product Manager",
    slug: "product-manager",
    icon_emoji: "🎯",
    description: "Define product vision, roadmap, and strategy while collaborating across teams to deliver value.",
  },
  {
    name: "Data Analyst",
    slug: "data-analyst",
    icon_emoji: "📊",
    description: "Extract insights from data, create visualizations, and drive business decisions with analytics.",
  },
  {
    name: "UX Designer",
    slug: "ux-designer",
    icon_emoji: "🎨",
    description: "Create intuitive, beautiful user experiences through research, design, and iteration.",
  },
  {
    name: "Business Analyst",
    slug: "business-analyst",
    icon_emoji: "📈",
    description: "Analyze business processes, gather requirements, and recommend solutions for business challenges.",
  },
  {
    name: "QA Engineer",
    slug: "qa-engineer",
    icon_emoji: "🧪",
    description: "Ensure software quality through comprehensive testing, automation, and quality assurance strategies.",
  },
];

async function seedRoles() {
  try {
    // Connect to database
    await connectDB();
    console.log("✓ Connected to database");

    // Clear existing roles
    await Role.deleteMany({});
    console.log("✓ Cleared existing roles");

    // Insert new roles
    const createdRoles = await Role.insertMany(roles);
    console.log(`✓ Created ${createdRoles.length} roles:`);
    
    createdRoles.forEach((role) => {
      console.log(`  - ${role.icon_emoji} ${role.name} (${role.slug})`);
    });

    console.log("\n✓ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Seeding failed:", error.message);
    process.exit(1);
  }
}

// Run seeding
seedRoles();
