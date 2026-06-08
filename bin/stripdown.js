#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const { getSourceFiles, formatBytes } = require('../lib/utils');
const { analyzeFiles } = require('../lib/analyzer');
const { generateWrapper } = require('../lib/wrapper');

const program = new Command();

program
  .name('stripdown')
  .description('A tool to reduce dependency bloat by creating a single compiled library.')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze the project and show usage report')
  .option('--src <dirs>', 'Comma-separated source directories to scan', './src')
  .action(async (options) => {
    const spinner = ora('Scanning project...').start();
    try {
      const projectRoot = process.cwd();
      const srcDirs = options.src.split(',').map(d => path.resolve(projectRoot, d.trim()));
      
      let allFiles = [];
      for (const dir of srcDirs) {
        if (await fs.pathExists(dir)) {
          const files = await getSourceFiles(dir);
          allFiles = allFiles.concat(files);
        }
      }

      spinner.text = `Analyzing ${allFiles.length} files...`;
      const usageMap = await analyzeFiles(allFiles);
      spinner.succeed(`Analysis complete! Found ${usageMap.size} external packages.`);

      console.log('\n' + chalk.bold('Usage Report:'));
      console.log('=============');
      
      for (const [pkg, used] of usageMap.entries()) {
        const functions = Array.from(used);
        console.log(`${chalk.cyan(pkg)}: ${functions.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program
  .command('compile')
  .description('Generate the stripdown wrapper package')
  .option('--src <dirs>', 'Comma-separated source directories to scan', './src')
  .option('--target <dir>', 'Target project root', '.')
  .action(async (options) => {
    const spinner = ora('Preparing to compile...').start();
    try {
      const projectRoot = path.resolve(process.cwd(), options.target);
      const srcDirs = options.src.split(',').map(d => path.resolve(process.cwd(), d.trim()));
      
      let allFiles = [];
      for (const dir of srcDirs) {
        if (await fs.pathExists(dir)) {
          const files = await getSourceFiles(dir);
          allFiles = allFiles.concat(files);
        }
      }

      spinner.text = `Analyzing ${allFiles.length} files...`;
      const usageMap = await analyzeFiles(allFiles);
      
      spinner.text = 'Generating stripdown wrapper...';
      const wrapperPath = await generateWrapper(usageMap, projectRoot);
      
      spinner.succeed(chalk.green('Compilation successful!'));
      console.log(`\nGenerated ${chalk.bold('stripdown')} package at: ${chalk.blue(wrapperPath)}`);
      console.log(`You can now import from it: ${chalk.yellow("const { ... } = require('stripdown');")}\n`);
      
    } catch (error) {
      spinner.fail('Compilation failed');
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program.parse(process.argv);
