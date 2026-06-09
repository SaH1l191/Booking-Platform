import type { QueryInterface } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    const now = new Date();

    await queryInterface.bulkInsert("categories", [
      { id: 1,  name: "Beachfront",   slug: "beachfront",   icon: "🏖️",  created_at: now, updated_at: now },
      { id: 2,  name: "Villa",        slug: "villa",        icon: "🏡",  created_at: now, updated_at: now },
      { id: 3,  name: "Mansion",      slug: "mansion",      icon: "🏰",  created_at: now, updated_at: now },
      { id: 4,  name: "Cabin",        slug: "cabin",        icon: "🛖",  created_at: now, updated_at: now },
      { id: 5,  name: "Countryside",  slug: "countryside",  icon: "🌾",  created_at: now, updated_at: now },
      { id: 6,  name: "Lakefront",    slug: "lakefront",    icon: "🏞️",  created_at: now, updated_at: now },
      { id: 7,  name: "Mountain",     slug: "mountain",     icon: "⛰️",  created_at: now, updated_at: now },
      { id: 8,  name: "Castle",       slug: "castle",       icon: "🏯",  created_at: now, updated_at: now },
      { id: 9,  name: "Tropical",     slug: "tropical",     icon: "🌴",  created_at: now, updated_at: now },
      { id: 10, name: "Desert",       slug: "desert",       icon: "🏜️",  created_at: now, updated_at: now },
      { id: 11, name: "Ski-in/out",   slug: "ski-in-out",   icon: "🎿",  created_at: now, updated_at: now },
      { id: 12, name: "Historic",     slug: "historic",     icon: "🏛️",  created_at: now, updated_at: now },
      { id: 13, name: "Modern",       slug: "modern",       icon: "🏢",  created_at: now, updated_at: now },
      { id: 14, name: "Treehouse",    slug: "treehouse",    icon: "🌳",  created_at: now, updated_at: now },
      { id: 15, name: "Boat",         slug: "boat",         icon: "🛥️",  created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.bulkDelete("categories", {}, {});
  },
};
