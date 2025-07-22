# Question Update Workflow

## 🔄 How to Update Questions

### Quick Method (Recommended)

1. **Edit the CSV file:**
   ```bash
   # Edit the questions in docs/Questions.csv
   open docs/Questions.csv
   ```

2. **Run the update script:**
   ```bash
   npm run update-questions
   ```

3. **Deploy changes:**
   ```bash
   git add .
   git commit -m "Update questions from CSV"
   git push origin main
   ```

### Manual Method

If you prefer to update manually:

1. Edit `docs/Questions.csv`
2. Run: `node scripts/update-questions.js`
3. Commit and push changes

## 📋 CSV File Structure

The CSV file (`docs/Questions.csv`) has these columns:

| Column | Interface | Question Set |
|--------|-----------|--------------|
| 1 | Kinnari Saraiya | Kinnari-Saraiya |
| 2 | dmstfctn | dmstfctn |
| 3 | Georgia Gardner | Georgia-Gardner |
| 4-7 | Exhibition Questions | Exhibition-Questions |

## 🔧 How It Works

1. **Parser Script** (`scripts/update-questions.js`):
   - Reads `docs/Questions.csv`
   - Parses each column into question sets
   - Generates `questions-data.js` automatically
   - Combines columns 4-7 into "Exhibition-Questions"

2. **Automatic Generation**:
   - Filters out empty questions
   - Removes duplicates
   - Escapes special characters
   - Adds timestamp and generation info

3. **Deployment**:
   - GitHub Pages automatically deploys on push
   - All interfaces immediately use new questions

## 📝 Adding New Questions

### To existing interfaces:
- Add questions to appropriate CSV column
- Run `npm run update-questions`
- Deploy

### For new artist interface:
1. Add new column to CSV
2. Create new config file: `config-artist-name.js`
3. Create new HTML file: `artist-name.html`
4. Update parser script to map new column
5. Add to directory page

## ⚠️ Important Notes

- **Never edit `questions-data.js` manually** - it gets overwritten
- **Always use the CSV as the source of truth**
- **Test locally before deploying** with `npm run test-questions`
- **Empty cells in CSV are ignored** - use this for spacing

## 🧪 Testing

```bash
# Test the parser without overwriting
npm run test-questions

# Serve locally to test
npm run dev
# Then visit: http://localhost:8080
```

## 🔍 Troubleshooting

**Script fails to run:**
- Make sure you're in the project root directory
- Check that `docs/Questions.csv` exists

**Questions not updating:**
- Run `npm run update-questions` 
- Check browser cache (hard refresh)
- Verify `questions-data.js` was updated

**CSV parsing errors:**
- Check for unmatched quotes in CSV
- Ensure proper CSV format
- Look at console output for specific errors
