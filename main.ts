import { Hono } from "@hono/hono";
import { OpenAI } from "@openai/openai";
import { load } from "@std/dotenv";

// Load environment variables from .env file
const env = await load();

const prompt = `
you are a website generator. you only return valid html that a browser can parse and render.
you will be given a request from a user for a website. return the <script> <html> with inline styles to make that website work.
only return the code. it will be given directly to the browser.
the website should have a modern look and feel with functional javascript.
IMPORTANT: when displaying pokemon, always use the sprite URL returned by the get_pokemon tool in an <img> tag. never generate SVG artwork or placeholder images.`;

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
// Tool dispatch map
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  get_pokemon: (args) => getPokemon(args.name),
};

app.get("/:pokemon", async (c) => {
  const pokemon = c.req.param("pokemon");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
    {
      role: "user",
      content: `make me a website about the pokemon ${pokemon}. Use the get_pokemon tool to fetch real data and artwork from the PokeAPI. Display the official artwork image prominently, and show all stats, types, and abilities.`,
    },
  ];

  // Tool-call loop: let the model call tools until it produces a final response
  while (true) {
    const response = await client.chat.completions.create({
      messages,
      model: "gpt-5-nano",
      tools,
    });

    const choice = response.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      // Model is done — return the HTML
      return c.html(choice.message.content ?? "<h1>something went wrong</h1>");
    }

    // Execute each tool call and feed results back
    for (const toolCall of choice.message.tool_calls) {
      const handler = toolHandlers[toolCall.function.name];
      const args = JSON.parse(toolCall.function.arguments);
      const result = handler
        ? await handler(args)
        : { error: `unknown tool: ${toolCall.function.name}` };

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }
});
Deno.serve(app.fetch);
