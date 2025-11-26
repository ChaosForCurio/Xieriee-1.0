import { freepikEngine } from '../src/lib/freepik/engine';
import { ALL_MODELS } from '../src/lib/freepik/config';

async function verifyEngine() {
    console.log('🔍 Verifying Freepik Engine Configuration...');

    console.log(`✅ Loaded ${ALL_MODELS.length} models.`);

    // Test Model Rotation Logic (Simulated)
    console.log('\n🕐 Testing Model Rotation Logic (Simulation)...');
    // We can't easily access private methods, but we can check if the engine initializes
    if (freepikEngine) {
        console.log('✅ FreepikEngine initialized successfully.');
    }

    console.log('\n⚠️  To fully verify, we need to run an actual generation.');
    console.log('   Run the app and use the Chat UI to generate an image.');
    console.log('   Check server logs for "[FreepikEngine]" messages.');
}

verifyEngine().catch(console.error);
