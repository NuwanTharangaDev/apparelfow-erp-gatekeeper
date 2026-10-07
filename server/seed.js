import 'dotenv/config'
import pool from './db.js'

const recipes = [
  {
    code: 'REC-BL01',
    name: 'Casual Blouse',
    category: 'Blouse',
    fabricYards: 1.8,
    wastageCap: 5,
    components: [
      ['Front Body Panel', 1],
      ['Back Body Panel', 1],
      ['Sleeves (Left & Right)', 2],
      ['Collar & Stand', 1],
      ['Sleeve Cuffs', 2],
    ],
  },
  {
    code: 'REC-CT02',
    name: 'Crop Top',
    category: 'Crop Top',
    fabricYards: 1.1,
    wastageCap: 8,
    components: [
      ['Front Chest Panel', 1],
      ['Back Support Panel', 1],
      ['Neck Binding Strip', 1],
      ['Hem Elastic Casing', 1],
      ['Side Strap Accents', 2],
    ],
  },
]

try {
  for (const recipe of recipes) {
    await pool.query(
      `INSERT INTO recipes (recipe_code, name, category, std_fabric_yards, wastage_cap)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (recipe_code) DO NOTHING`,
      [recipe.code, recipe.name, recipe.category, recipe.fabricYards, recipe.wastageCap]
    )

    const { rows } = await pool.query(
      'SELECT id FROM recipes WHERE recipe_code = $1',
      [recipe.code]
    )
    const recipeId = rows[0].id

    for (const [name, pieces] of recipe.components) {
      await pool.query(
        `INSERT INTO recipe_components (recipe_id, component_name, pieces_per_garment)
         VALUES ($1, $2, $3)
         ON CONFLICT (recipe_id, component_name) DO NOTHING`,
        [recipeId, name, pieces]
      )
    }
  }
  console.log('Recipes seeded')
} catch (err) {
  console.error('Seeding failed:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}