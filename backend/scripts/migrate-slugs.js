/**
 * Migration script: strip the trailing timestamp from existing problem slugs.
 * When a clean slug conflicts, assigns a sequential number suffix.
 * Run: node scripts/migrate-slugs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('../models/Problem');

async function getUniqueSlug(baseSlug, currentId) {
    let slug = baseSlug;
    let counter = 2;
    while (true) {
        const existing = await Problem.findOne({ slug, _id: { $ne: currentId } }).lean();
        if (!existing) return slug;
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}

async function run() {
    const URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
    if (!URI) { console.error('No MONGODB_URI in .env'); process.exit(1); }

    await mongoose.connect(URI);
    console.log('Connected to MongoDB\n');

    const problems = await Problem.find({}).lean();
    let updated = 0, already_clean = 0;

    for (const p of problems) {
        // Strip trailing 13-digit timestamp like -1708773819456
        const baseClean = p.slug.replace(/-\d{13}$/, '');
        if (baseClean === p.slug) {
            already_clean++;
            continue;
        }

        // Get a unique clean slug (handles conflicts with numbered suffix)
        const newSlug = await getUniqueSlug(baseClean, p._id);
        await Problem.updateOne({ _id: p._id }, { $set: { slug: newSlug } });
        console.log(`  ${p.slug}`);
        console.log(`  => ${newSlug}\n`);
        updated++;
    }

    console.log(`Done! Updated: ${updated}, Already clean: ${already_clean}`);
    await mongoose.disconnect();
}

run().catch(err => { console.error(err.message); process.exit(1); });
