import { Hono } from "@hono/hono";
import { OpenAI } from "@openai/openai";
import { load } from "@std/dotenv";

// Load environment variables from .env file
const env = await load();

const prompt = `
you are a website generator. you only return valid html that a browser can parse and render.
you will be given a request from a user for a website. return the <script> <html> with inline styles to make that website work.
only return the code. it will be given directly to the browser.
the website should have a modern look and feel with functional javascript.`;

// Fetch Pokémon details from the public PokeAPI
async function getPokemon(name: string) {
  const id = (name || "pikachu").toLowerCase().trim() || "pikachu";
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(id)}`
  );
  if (!res.ok) {
    return { error: `pokemon '${id}' not found`, status: res.status };
  }
  const data = await res.json();
  return {
    name: data.name,
    id: data.id,
    height: data.height,
    weight: data.weight,
    types: (data.types ?? []).map((t: any) => t?.type?.name).filter(Boolean),
    abilities: (data.abilities ?? [])
      .map((a: any) => a?.ability?.name)
      .filter(Boolean),
    stats: (data.stats ?? [])
      .map((s: any) => ({ name: s?.stat?.name, base: s?.base_stat }))
      .filter((s: any) => s?.name),
    sprite:
      data?.sprites?.other?.["official-artwork"]?.front_default ||
      data?.sprites?.front_default ||
      null,
  };
}

// Expose getPokemon as a tool for the model to call
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_pokemon",
      description: "Fetch Pokémon details from PokeAPI by name.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Pokémon name (e.g., 'pikachu').",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
];

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const app = new Hono();
app.get("/:pokemon", async (c) => {
  const pokemon = c.req.param("pokemon");
  const chatCompletion = await client.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `make me a website about ${pokemon}` }
    ],
    model: "gpt-5-nano",
  });
  const html = chatCompletion.choices[0].message.content

  return c.html(html ?? '<h1>something went wrong</h1>')
});
Deno.serve(app.fetch);
