$1

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);


const consoleLogPattern = /console\.log\s*\([^;]*\);?/g;


const directories = [
    path.join(__dirname, '..', 'resources', 'js'),
    path.join(__dirname, '..', 'resources', 'js', 'Components'),
    path.join(__dirname, '..', 'resources', 'js', 'Pages'),
    path.join(__dirname, '..', 'resources', 'js', 'utils')
];


const extensions = ['.js', '.jsx'];


async function processFile(filePath) {
    try {
        
        const content = await readFile(filePath, 'utf8');
        
        
        if (consoleLogPattern.test(content)) {
            
            const newContent = content.replace(consoleLogPattern, '');
            
            
            await writeFile(filePath, newContent, 'utf8');
            
            console.log(`Processed: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return false;
    }
}


async function processDirectory(directory) {
    try {
        const entries = await readdir(directory);
        let processedCount = 0;
        
        for (const entry of entries) {
            const entryPath = path.join(directory, entry);
            const entryStat = await stat(entryPath);
            
            if (entryStat.isDirectory()) {
                
                processedCount += await processDirectory(entryPath);
            } else if (entryStat.isFile() && extensions.includes(path.extname(entryPath))) {
                
                if (await processFile(entryPath)) {
                    processedCount++;
                }
            }
        }
        
        return processedCount;
    } catch (error) {
        console.error(`Error processing directory ${directory}:`, error);
        return 0;
    }
}


async function main() {
    console.log('Starting to remove console.log statements...');
    let totalProcessed = 0;
    
    for (const directory of directories) {
        const processed = await processDirectory(directory);
        totalProcessed += processed;
        console.log(`Processed ${processed} files in ${directory}`);
    }
    
    console.log(`Finished! Removed console.log statements from ${totalProcessed} files.`);
}


main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
