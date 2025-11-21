
const { exec } = require('child_process');

exec('npx eslint src --ext .ts,.tsx', (error, stdout, stderr) => {
    if (error) {
        console.log('Error code:', error.code);
    }
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
});
