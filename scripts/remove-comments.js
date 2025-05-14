import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const readdir = fs.promises.readdir;
const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;
const stat = fs.promises.stat;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const extensions = {
    js: ['.js', '.jsx'],
    php: ['.php'],
    css: ['.css'],
    config: ['.json', '.yaml', '.yml', '.conf', '.ini']
};


const excludeDirs = [
    'node_modules',
    'vendor',
    '.git',
    'storage',
    'bootstrap/cache'
];


const patterns = {
    
    js: [
        
        /\/\*\*[\s\S]*?\*\
        
        /\/\*[\s\S]*?\*\
        
        /(^|[^:"'`])\/\/.*$/gm
    ],
    
    php: [
        
        /\/\*\*[\s\S]*?\*\
        
        /\/\*[\s\S]*?\*\
        
        /(^|[^:"'`])\/\/.*$/gm,
        
        /#.*$/gm
    ],
    
    css: [
        
        /\/\*[\s\S]*?\*\
    ],
    
    config: [
        
        /\/\*[\s\S]*?\*\
        
        /#.*$/gm
    ]
};


async function processFile(filePath) {
    try {
        
        const content = await readFile(filePath, 'utf8');
        let newContent = content;
        const ext = path.extname(filePath).toLowerCase();

        
        let patternsToUse = [];

        if (extensions.js.includes(ext)) {
            patternsToUse = patterns.js;
        } else if (extensions.php.includes(ext)) {
            patternsToUse = patterns.php;
        } else if (extensions.css.includes(ext)) {
            patternsToUse = patterns.css;
        } else if (extensions.config.includes(ext)) {
            patternsToUse = patterns.config;
        } else {
            return false; 
        }

        
        for (const pattern of patternsToUse) {
            newContent = newContent.replace(pattern, '$1');
        }

        
        if (newContent !== content) {
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

            
            if (excludeDirs.some(dir => entryPath.includes(dir))) {
                continue;
            }

            const entryStat = await stat(entryPath);

            if (entryStat.isDirectory()) {
                
                processedCount += await processDirectory(entryPath);
            } else if (entryStat.isFile()) {
                
                const ext = path.extname(entryPath).toLowerCase();
                const allExtensions = [
                    ...extensions.js,
                    ...extensions.php,
                    ...extensions.css,
                    ...extensions.config
                ];

                if (allExtensions.includes(ext)) {
                    if (await processFile(entryPath)) {
                        processedCount++;
                    }
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
    const rootDir = path.resolve(__dirname, '..');
    console.log(`Starting to process files in ${rootDir}`);

    const processedCount = await processDirectory(rootDir);
    console.log(`Processed ${processedCount} files`);
}


main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
