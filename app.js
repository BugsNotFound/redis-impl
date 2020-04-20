const fs = require('fs'),
    chalk = require('chalk'),
    readline = require("readline"),

    myRedis = require("./util/redis.js");


// DEFAULT CONFIG
const DEFAULT_CONFIG = {
    snapshot_interval: '120',
    backup_folder: __dirname + '/backup'
};

async function processUserCommands(redisClient) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Listening for Commands:");

    process.stdout.write("> ");
    
    for await (var command of rl) {
        try{
            command = command.replace( /\s\s+/g, ' ');
            command = command.trim();
            console.log(redisClient.executeCommand(command));
        }catch(err){
            if(err == "err"){
                console.log(chalk.red("(error) Something went wrong"));
            }else{
                console.error(chalk.red(err));
            }
        }finally{
            process.stdout.write("> ");
        }
    }
}


function init () {
    // Read config file
    fs.readFile(`${__dirname}/.config`, 'utf8', function (err, data) {
        let config,
            parsingError;

        try {
            config = JSON.parse(data);
        }
        catch (e) {
            parsingError = e;
        }

        if (err || parsingError) {
            console.log(chalk.red('Failed to load config, using default settings'));
            let redisClient = myRedis.createClient(DEFAULT_CONFIG);
            return processUserCommands(redisClient);
        }

        let redisClient = myRedis.createClient(config);
        return processUserCommands(redisClient);
    });
}

init();