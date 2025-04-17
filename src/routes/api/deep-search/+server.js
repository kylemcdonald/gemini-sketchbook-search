import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { query } = await request.json();
    
    // Simulate a 5 second delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Return specific pages as mock results
    const results = [
      {
        filename: "18/118.json",
        explanation: "Intimate portrait of a woman sleeping"
      },
      {
        filename: "6/119.json",
        explanation: "Two portraits of someone sleeping"
      },
      {
        filename: "4/153.json",
        explanation: "Careful portrait of a young woman"
      }
    ];
    
    return json(results);
  } catch (error) {
    console.error('Deep search error:', error);
    return json({ error: 'Failed to perform deep search' }, { status: 500 });
  }
} 