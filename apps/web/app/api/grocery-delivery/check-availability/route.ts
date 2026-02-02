import { NextRequest, NextResponse } from 'next/server';

// Simple availability check based on ZIP code prefixes
// This is a simplified version - in reality, you'd check against actual service areas
const serviceAvailability: { [service: string]: string[] } = {
  amazonFresh: ['100', '111', '900', '941', '981', '606', '773', '917', '212', '310', '415', '206', '020', '021', '022'],
  instacart: [], // Available almost everywhere
  shipt: [], // Wide availability  
  gopuff: ['100', '111', '900', '941', '191', '606', '773', '212', '718', '347', '020', '021', '022', '191', '192'],
  walmartPlus: [] // Wide availability
};

export async function POST(request: NextRequest) {
  try {
    const { zipCode } = await request.json();
    
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({ error: 'Invalid ZIP code' }, { status: 400 });
    }

    const availability = {
      amazonFresh: checkServiceAvailability('amazonFresh', zipCode),
      instacart: checkServiceAvailability('instacart', zipCode),
      shipt: checkServiceAvailability('shipt', zipCode),
      gopuff: checkServiceAvailability('gopuff', zipCode),
      walmartPlus: checkServiceAvailability('walmartPlus', zipCode)
    };

    return NextResponse.json({ availability });
    
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}

function checkServiceAvailability(service: string, zipCode: string): boolean {
  const prefixes = serviceAvailability[service];
  if (!prefixes || prefixes.length === 0) {
    return true; // Assume wide availability
  }
  
  return prefixes.some(prefix => zipCode.startsWith(prefix));
}