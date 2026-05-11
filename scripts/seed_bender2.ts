import { prisma } from "../src/lib/db";
import {
  BENDER2_RULE_SET,
  BENDER2_INPUTS,
  BENDER2_OUTPUTS,
  BENDER2_TEST_META,
} from "../src/data/bender2_ruleset";

async function main() {
  const existing = await prisma.test.findFirst({
    where: { name: BENDER2_TEST_META.name },
  });

  const data = {
    name: BENDER2_TEST_META.name,
    description: BENDER2_TEST_META.description,
    category: BENDER2_TEST_META.category,
    ageRange: BENDER2_TEST_META.ageRange,
    scoringRules: BENDER2_RULE_SET as unknown as object,
    inputs: BENDER2_INPUTS as unknown as object,
    outputs: BENDER2_OUTPUTS as unknown as object,
    isActive: true,
  };

  if (existing) {
    const updated = await prisma.test.update({
      where: { id: existing.id },
      data,
    });
    console.log(`Updated existing Bender II test: ${updated.id}`);
  } else {
    const created = await prisma.test.create({ data });
    console.log(`Created Bender II test: ${created.id}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
