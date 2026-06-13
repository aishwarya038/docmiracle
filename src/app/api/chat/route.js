import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { document, fileName, history, message } = await req.json();

    const MAX_CHARS = 5000; 
    const safeDocument = document.length > MAX_CHARS 
      ? document.substring(0, MAX_CHARS) + "\n\n...[Document truncated due to length limits]..." 
      : document;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    if (!document || !message) {
      return NextResponse.json(
        { error: "Missing document or message" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a Senior Data Analyst.
Formatting Rules (Mandatory):
1. When providing summaries or lists, ALWAYS use standard Markdown bullet points (using '- ') or numbered lists ('1. ').
2. Ensure every list item is separated by a clear line break.
3. Use bolding (**text**) for key metrics, headers, or critical insights to ensure readability.
4. Structure your response as a professional report: Start with a brief high-level insight, followed by structured, organized points.
5. Do not use conversational filler. Be concise, direct, and act like a high-level data expert who is being judged on the clarity and structure of their output.
6. If the answer is not present in the document, state that clearly and professionally.
7. Handle Messy Data: The provided document may contain noise, inconsistent formatting, or raw logs. Ignore irrelevant artifacts (like log headers or random symbols) and focus on extracting key metrics, trends, and relationships.
8 Statistical Context: Whenever you provide a metric (like average latency), always mention if the sample size is limited or if the data is statistically significant.
9. Balanced Metrics: Never report 'speed' or 'latency' without also checking for 'error rates' or 'reliability'. If you see ERR statuses, always mention the impact on system stability.
10. Professional Tone: Speak like an expert. Use terms like 'statistical significance,' 'sample size,' 'performance threshold,' and 'root cause analysis.'
11. Actionable Insights: Always link your findings to a business or technical recommendation (e.g., 'This is within threshold, but further investigation is needed due to X').

Document Context:
Filename: ${fileName || "uploaded document"}
Content:
"""
${document}
"""`;

    const chatHistory = (history || [])
      .slice(-4)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: message },
        ],
        temperature: 0.3, // Lower temperature makes the AI more precise and less prone to "fluff"
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Groq API error");
    }

    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error("Groq API error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}