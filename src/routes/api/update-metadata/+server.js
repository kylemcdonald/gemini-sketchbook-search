import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function POST({ request }) {
  try {
    const { filename, transcript } = await request.json();
    
    // Read the current metadata file
    const metadataPath = path.join(process.cwd(), 'static/data/metadata-labeled.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // Find and update the specific entry
    const index = metadata.findIndex(item => item.filename === filename);
    if (index === -1) {
      return json({ error: 'Metadata entry not found' }, { status: 404 });
    }
    
    // Update the transcript
    metadata[index] = {
      ...metadata[index],
      transcript
    };
    
    // Write the updated metadata back to the file
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return json(metadata[index]);
  } catch (error) {
    console.error('Error updating metadata:', error);
    return json({ error: 'Failed to update metadata' }, { status: 500 });
  }
} 