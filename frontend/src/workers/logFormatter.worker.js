import { format } from 'sql-formatter';

/* eslint-disable no-restricted-globals */

self.onmessage = (e) => {
    const { content } = e.data;
    
    if (!content || !content.trim()) {
        self.postMessage({ error: "Please enter some log content to format." });
        return;
    }

    try {
        // 1. Basic splitting by newline
        let processed = content.replace(/\\n/g, '\n'); // Handle literal newlines

        // 2. Identify common log timestamp patterns and force a split before them
        // Matches: YYYY-MM-DD followed by T or space, HH:mm:ss, but NOT if at start of line
        processed = processed.replace(/([^\n])(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/g, '$1\n$2');

        // 3. Format Stack Traces (Java)
        // Split "Caused by:" - handle various spacing
        processed = processed.replace(/Caused by:/g, '\nCaused by:');
        
        // Split "at package.Class(File:Line)" - standard
        processed = processed.replace(/\s+at\s+([a-zA-Z0-9_$.<>]+)\(/g, '\n    at $1(');

        // Split "package.Class.Method(File:Line)" - non-standard (often missing 'at')
        // We look for a pattern like " com.example.MyClass.method(MyClass.java:123)"
        // The regex looks for: space + qualified name + ( + file + : + line + )
        processed = processed.replace(/\s+([a-zA-Z0-9_$.<>]+)\(([a-zA-Z0-9_$.]+:\d+)\)/g, '\n    at $1($2)');

        // Split "... x more"
        processed = processed.replace(/\s+\.\.\. (\d+) more/g, '\n    ... $1 more');
        
        // Split chained exceptions that look like "Exception: com.example.OtherException:"
        // We look for a pattern where an exception class name is followed by ": "
        processed = processed.replace(/(\s)([a-zA-Z0-9_$.]+Exception:)/g, '$1\n$2');

        const lines = processed.split('\n');
        
        const formattedLines = lines.map(line => {
            if (!line.trim()) return '';

            let result = '';
            let i = 0;
            
            // Check for SQL (Heuristic)
            // Look for common SQL starting keywords ANYWHERE in the line.
            // But to avoid false positives (like "Please SELECT an item"), we check if the line
            // *starts* with the keyword (ignoring non-alphanumeric prefixes).
            // OR if it follows common SQL preambles like "Query:", "SQL:", "Hibernate:".
            
            // 1. Try to find the first occurrence of a major SQL keyword
            const keywordMatch = /SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH|MERGE/i.exec(line);
            
            if (keywordMatch) {
                const keyword = keywordMatch[0].toUpperCase();
                const index = keywordMatch.index;
                const prefix = line.substring(0, index);
                
                // Now verify if this is likely a SQL log.
                // It is likely SQL if:
                // a) The prefix matches common log patterns (date, thread, logger name) AND ends with separator
                // b) The keyword is at the "start" of the message part of the log.
                
                // Let's look at the prefix. does it end with ": " or "- "?
                // Or is it empty?
                // Also double check if the keyword is a whole word (boundary check is in regex below)
                
                // Improved regex with word boundary
                const strictMatch = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH|MERGE)\b/i.exec(line);
                
                if (strictMatch) {
                    const matchIndex = strictMatch.index;
                    const sqlCandidate = line.substring(matchIndex);
                    
                    // Filter out short false positives
                    if (sqlCandidate.length > 15) {
                         try {
                            const formattedSql = format(sqlCandidate, {
                                language: 'sql',
                                tabWidth: 2,
                                keywordCase: 'upper',
                                linesBetweenQueries: 2,
                            });
                            
                            // If formatting didn't change anything (except maybe whitespace trimming), 
                            // it might have been treated as a plain string by the formatter.
                            // But sql-formatter usually does *something*.
                            
                            // Only apply if the result is multi-line OR if the input was long.
                            // Actually, just apply it.
                            return line.substring(0, matchIndex) + '\n' + formattedSql + '\n';
                        } catch (e) {
                            // ignore
                        }
                    }
                }
            }

            while (i < line.length) {
                if (line[i] === '{' || line[i] === '[') {
                    // Potential start of JSON
                    const start = i;
                    const char = line[i];
                    const closing = char === '{' ? '}' : ']';
                    
                    let balance = 1;
                    let j = i + 1;
                    let inString = false;
                    let escaped = false;
                    
                    while (j < line.length && balance > 0) {
                        const c = line[j];
                        
                        if (!escaped && c === '"') {
                            inString = !inString;
                        } else if (!inString && !escaped) {
                            if (c === char) balance++;
                            else if (c === closing) balance--;
                        }
                        
                        if (c === '\\' && !escaped) escaped = true;
                        else escaped = false;
                        
                        j++;
                    }
                    
                    if (balance === 0) {
                        const candidate = line.substring(start, j);
                        try {
                            const parsed = JSON.parse(candidate);
                            // Valid JSON found!
                            const pretty = JSON.stringify(parsed, null, 2);
                            result += '\n' + pretty + '\n';
                            i = j; // Advance index past the JSON
                            continue;
                        } catch (e) {
                            // Not valid JSON, treat as text
                        }
                    }
                }
                
                result += line[i];
                i++;
            }
            return result;
        });
        
        const result = formattedLines.filter(line => line.trim() !== '').join('\n');
        
        self.postMessage({ result });
    } catch (err) {
        self.postMessage({ error: `Error formatting log: ${err.message}` });
    }
};
