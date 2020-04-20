const fs = require('fs');
const path = require('path');
var chalk = require('chalk');

class myRedis{
    constructor(config){
        this._commands = this.get_commands();
        this.k_s = new Map();
        this.WillExpireAt = new Map();
        this.scoreOfValue = new Map();
        this.k_s['SET KEYS'] = [];

        this.backup_folder = config.backup_folder;
        this.snapshot_interval = config.snapshot_interval;
    }
    
    
    get_commands(){
        var to_return = new Map();
        to_return['GET'] = this.f_get;
        to_return['SET'] = this.f_set,
        to_return['DEL'] = this.f_del;           
        to_return['FLUSHALL'] = this.f_flushall;
        to_return['MGET'] = this.f_mget;
        to_return['MSET'] = this.f_mset;
        to_return['EXPIRE'] = this.f_expire;
        to_return['SETEX'] = this.f_setex;
        to_return['TTL'] = this.f_ttl;
        to_return['INCR'] = this.f_incr; 
        to_return['DECR'] = this.f_decr; 
        to_return['RENAME'] = this.f_rename;
        to_return['APPEND'] = this.f_append;
        to_return['EXISTS'] = this.f_exists;
        to_return['LPUSH'] = this.f_lpush;
        to_return['RPUSH'] = this.f_rpush;
        to_return['LRANGE'] = this.f_lrange;
        to_return['LPOP'] = this.f_lpop;
        to_return['RPOP'] = this.f_rpop;
        to_return['LLEN'] = this.f_llen;
        to_return['SADD'] = this.f_sadd;
        to_return['SISMEMBER'] = this.f_sismember;
        to_return['SMEMBERS'] = this.f_smembers;
        to_return['SCARD'] = this.f_scard;
        to_return['ZADD'] = this.f_zadd;
        to_return['ZRANGE'] = this.f_zrange;
        to_return['ZRANK'] = this.f_zrank;
        
        return to_return;
    }

    executeCommand(query){
        if(query.toUpperCase() == "PING"){
            return "PONG";
        }
        query = query.split(" ");
        var cmd = query[0].toUpperCase();
        
        if(cmd in this._commands)
            var to_return = this._commands[cmd].call(this, ...query.slice(1));
        else
            throw "Command not found";

        if(to_return == undefined){
            throw "Item not found";
        }

        if(typeof to_return == 'object'){
            return to_return;
        }else{
            return '"' + to_return + '"';
        }
    }

    f_get(){
        if(arguments.length != 1){
            throw "(error) ERR wrong number of arguments for 'get' command";
        }
        if(this.f_exists(arguments[0])){
            return this.k_s[arguments[0]];
        }else{
            return undefined;
        }
    }

    f_set(){
        if(arguments.length != 2){
            throw "(error) ERR wrong number of arguments for 'set' command";
        }
        this.k_s[arguments[0]] = arguments[1];
        return "OK";
    }

    f_del(){
        if(arguments.length == 0){
            throw "(error) ERR wrong number of arguments for 'del' command";
        }
        var count = 0;
        for(var i=0; i<arguments.length; i++){
            if(arguments[i] in this.k_s){
                if(this.k_s[arguments[i]] instanceof Set){
                    const index = this.k_s['SET KEYS'].indexOf(arguments[i]);
                    if (index > -1) {
                        this.k_s['SET KEYS'].splice(index, 1);
                    }
                }
                delete this.k_s[arguments[i]];
                if(arguments[0] in this.WillExpireAt){
                    delete this.WillExpireAt[arguments[0]];
                }
                count++;
            }
        }    
        return "(integer) " + count;  
    }

    f_flushall(){
        this.k_s.clear();
        return "OK";
    }

    f_mget(){
        if(arguments.length == 0){
            throw "(error) ERR wrong number of arguments for 'mget' command";
        }
        return Object.values(arguments).map((x) => {
            if(x in this.k_s)
                return this.k_s[x];
            return "(nil)";
        });
    }

    f_mset(){
        if(arguments.length % 2 != 0){
            throw "(error) ERR wrong number of arguments for MSET";
        }
        for(var i=0; i<arguments.length; i+=2){
            this.k_s[arguments[i]] = arguments[i+1];
        }
        return "OK";
    }
    
    f_expire(){ 
        if(arguments.length != 2){ 
            throw "(error) ERR wrong number of arguments for 'expire' command";
        }
        
        if(isNaN(Number(arguments[1]))){
            throw "(error) ERR value is not an integer or out of range";
        }

        this.WillExpireAt[arguments[0]] = (new Date()).getTime() + arguments[1]*1000;

        setTimeout(() => {
            this.f_del(arguments[0]);
        }, arguments[1]*1000);

        return "(integer) 1";  
    }

    f_ttl(){
        if(arguments.length != 1){
            throw "(error) ERR wrong number of arguments for 'ttl' command";
        }
        if( !(arguments[0] in this.k_s) || !(arguments[0] in this.WillExpireAt)){
            return -1;
        }

        var currentTime = (new Date()).getTime();
        var timeRemaining = parseInt((this.WillExpireAt[arguments[0]] - currentTime)/1000);

        if(timeRemaining <= 0){
            return -2;
        }else{
            return timeRemaining;
        }
    }

    f_incr(){
        if(arguments.length != 1){
            throw "(error) ERR wrong number of arguments for 'incr' command";
        }
        if(arguments[0] in this.k_s){
            if(isNaN(Number(this.k_s[arguments[0]]))){
                throw "(error) ERR value is not an integer or out of range";
            }
        }else{
            this.k_s[arguments[0]] = 0;
        }
        
        this.k_s[arguments[0]] = parseInt(this.k_s[arguments[0]]) + 1;
        return "(integer) " + this.k_s[arguments[0]];
    }

    f_decr(){
        if(arguments.length != 1){
            throw "(error) ERR wrong number of arguments for 'incr' command";
        }
        if(arguments[0] in this.k_s){
            if(isNaN(Number(this.k_s[arguments[0]]))){
                throw "(error) ERR value is not an integer or out of range";
            }
        }else{
            this.k_s[arguments[0]] = 0;
        }
        
        this.k_s[arguments[0]] = parseInt(this.k_s[arguments[0]]) - 1;
        return "(integer) " + this.k_s[arguments[0]];
    }

    f_setex(){
        this.f_set(arguments[0], arguments[2]);
        this.f_expire(arguments[0], arguments[1]);
        return "OK";
    }

    f_rename(){
        if(arguments.length != 2){
            throw "(error) ERR wrong number of arguments for 'rename' command";
        }
        if(! (arguments[0] in this.k_s) ){
            throw "(error) ERR no such key";
        }

        if(arguments[0] in this.WillExpireAt){
            var currentTime = (new Date()).getTime();
            this.f_expire(arguments[1], parseInt((this.WillExpireAt[arguments[0]] - currentTime)/1000));
            delete this.WillExpireAt[arguments[0]];
        }
        this.k_s[arguments[1]] = this.k_s[arguments[0]];
        delete this.k_s[arguments[0]];
        return "OK";
    }

    f_append(){
        if(arguments.length != 2){
            throw "(error) ERR wrong number of arguments for 'append' command";
        }

        if(this.f_exists(arguments[0])){
            this.k_s[arguments[0]] = this.k_s[arguments[0]] + arguments[1];
        }else{
            this.f_set(...arguments);
        }
        
        return this.k_s[arguments[0]].length;
    }

    f_exists(){
        if(arguments.length != 1){
            throw "(error) ERR wrong number of arguments for 'exists' command";
        }
        return arguments[0] in this.k_s;
    }

    f_lpush(){
        if(arguments.length<=1){
            throw "(error) ERR wrong number of arguments for 'lpush' command";
        }

        if(! (arguments[0] in this.k_s) ){
            this.k_s[arguments[0]] = [];   
        }
        
        if(!Array.isArray(this.k_s[arguments[0]])){
            throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
        }

        for(var i=1; i<arguments.length; i++){
            this.k_s[arguments[0]].unshift(arguments[i]);
        }
        return this.k_s[arguments[0]].length;
    }

    f_rpush(){
        if(arguments.length<=1){
            throw "(error) ERR wrong number of arguments for 'rpush' command";
        }
        
        if(! (arguments[0] in this.k_s) ){
            this.k_s[arguments[0]] = [];   
        }

        if(!Array.isArray(this.k_s[arguments[0]])){
            throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
        }
        
        for(var i=1; i<arguments.length; i++){
            this.k_s[arguments[0]].push(arguments[i]);
        }
        return this.k_s[arguments[0]].length;
    }

    f_lrange(){
        if(arguments.length != 3){
            throw "(error) ERR wrong number of arguments for 'lrange' command";
        }

        if(arguments[0] in this.k_s){
            if(!Array.isArray(this.k_s[arguments[0]])){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            }    

            //console.log(arguments, typeof arguments[1], typeof arguments[2]);
            if(isNaN(Number(arguments[1])) || isNaN(Number(arguments[2]))){
                throw "(error) ERR value is not an integer or out of range";
            }

            if(arguments[1]<0){
                arguments[1] = parseInt(this.k_s[arguments[0]].length) + parseInt(arguments[1]);
            }
            if(arguments[2]<0){
                arguments[2] = parseInt(this.k_s[arguments[0]].length) + parseInt(arguments[2]);
            }
            
            return this.k_s[arguments[0]].slice(arguments[1], arguments[2]+1);
        }else{
            throw "(empty list or set)";
        }
    }

    f_lpop(){
        if(arguments[0] in this.k_s){
            if(!Array.isArray(this.k_s[arguments[0]])){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            }    
            if(this.k_s[arguments[0]].length==0){
                throw "(error) List already empty";
            };
            return this.k_s[arguments[0]].shift();
        }
    }

    f_rpop(){
        if(arguments[0] in this.k_s){
            if(!Array.isArray(this.k_s[arguments[0]])){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            }    
            if(this.k_s[arguments[0]].length==0){
                throw "(error) List already empty"
            };
            return this.k_s[arguments[0]].pop();
        }
    }

    f_llen(){
        if(arguments.length==0){
            throw "(error) ERR wrong number of arguments for 'llen' command";
        }

        if(arguments[0] in this.k_s){
            if(!Array.isArray(this.k_s[arguments[0]])){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            } 
            
            return this.k_s[arguments[0]].length;
        }else{
            return 0;
        }
    }

    f_sadd(){
        if(arguments.length<=1){
            throw "(error) ERR wrong number of arguments for 'sadd' command";
        }

        var count = 0;
        if(! (arguments[0] in this.k_s) ){
            this.k_s[arguments[0]] = new Set(); 
            this.k_s['SET KEYS'].push(arguments[0]);  
        }
        
        if(! (this.k_s[arguments[0]] instanceof Set) ){
            throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
        }

        for(var i=1; i<arguments.length; i++){
            if(this.f_sismember(arguments[0], arguments[i]) == "(integer) 1"){
                continue;
            }
            count++;
            this.k_s[arguments[0]].add(arguments[i]);
        }
        return "(integer) " + count;
    }

    f_sismember(){
        if(arguments.length!=2){
            throw "(error) ERR wrong number of arguments for 'sismember' command";
        }

        if(! (arguments[0] in this.k_s) ){
            return "(integer) 0";
        }else{
            if(! (this.k_s[arguments[0]] instanceof Set) ){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            }
            return "(integer) " + Number(this.k_s[arguments[0]].has(arguments[1]));
        }
    }

    f_smembers(){
        if(arguments.length==0){
            throw "(error) ERR wrong number of arguments for 'smembers' command";
        }
        if(! (arguments[0] in this.k_s) ){
            throw "(empty list or set)";
        }
        if(! (this.k_s[arguments[0]] instanceof Set) ){
            throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
        }
        return Array.from(this.k_s[arguments[0]]);
    }

    f_scard(){
        if(arguments.length==0){
            throw "(error) ERR wrong number of arguments for 'scard' command";
        }
        if(! (arguments[0] in this.k_s) ){
            throw "(integer) 0";
        }
        if(! (this.k_s[arguments[0]] instanceof Set) ){
            throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
        }
        return this.k_s[arguments[0]].size;
    }

    f_zadd(){
        if(arguments.length<=1 || arguments.length%2==0){
            throw "(error) ERR wrong number of arguments for 'zadd' command";
        }
        var count = 0;
        if(! (arguments[0] in this.k_s) ){
            this.k_s[arguments[0]] = new Set();   
            this.k_s['SET KEYS'].push(arguments[0]);
        }

        if(! (this.k_s[arguments[0]] instanceof Set) ){
            throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
        }
        this.scoreOfValue[arguments[0]] = new Map();
        for(var i=1; i<arguments.length; i+=2){
            if(this.f_sismember(arguments[0], arguments[i+1]) == "(integer) 1"){
                this.scoreOfValue[arguments[0]][arguments[i+1]] = arguments[i];
                continue;
            }
            count++;
            this.k_s[arguments[0]].add(arguments[i+1]);  //value
            this.scoreOfValue[arguments[0]][arguments[i+1]] = arguments[i];
        }
        return "(integer) " + count;
    }

    f_zrange(){
        if(arguments.length!=3 && arguments.length!=4){
            throw "(error) ERR wrong number of arguments for 'lrange' command";
        }
        
        if(arguments[0] in this.k_s){
            if(! (this.k_s[arguments[0]] instanceof Set) ){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            }
            
            
            if(isNaN(Number(arguments[1])) || isNaN(Number(arguments[2]))){
                throw "(error) ERR value is not an integer or out of range";
            }
            
            var to_return = (Array.from(this.k_s[arguments[0]])).sort((a, b) => {
                return this.scoreOfValue[arguments[0]][a] - this.scoreOfValue[arguments[0]][b];
            });

            if(arguments[1]<0){
                arguments[1] = parseInt(this.k_s[arguments[0]].size) + parseInt(arguments[1]);
            }
            if(arguments[2]<0){
                arguments[2] = parseInt(this.k_s[arguments[0]].size) + parseInt(arguments[2]);
            }
            
            if(arguments.length==3){
                return to_return.slice(arguments[1], parseInt(arguments[2])+1);
            }else if(arguments.length==4 && arguments[3].toLowerCase()=="withscores"){
                var temp = to_return.map((elem) => {
                    return [elem + ' | ' + this.scoreOfValue[arguments[0]][elem]]; 
                });
                return temp.slice(arguments[1], parseInt(arguments[2])+1);
            }else{
                throw "(error) ERR syntax error";
            }
        }else{
            throw "(nil)";
        }
    }

    f_zrank(){
        if(arguments.length!=2){
            throw "(error) ERR wrong number of arguments for 'zrank' command";
        }

        if(arguments[0] in this.k_s){
            if(! (this.k_s[arguments[0]] instanceof Set) ){
                throw "(error) WRONGTYPE Operation against a key holding the wrong kind of value";
            }
            
            if(!this.k_s[arguments[0]].has(arguments[1])){
                return "(nil)";
            }

            var arr = (Array.from(this.k_s[arguments[0]])).sort((a, b) => {
                return this.scoreOfValue[arguments[0]][a] - this.scoreOfValue[arguments[0]][b];
            });

            return arr.indexOf(arguments[1]);
        }else{
            throw "(nil)";
        }
    }

    _saveToFile(myObj, myPath){
        var myData = JSON.stringify(myObj, (key, value) => {
            if(typeof value==='object' && value instanceof Set){
                return [...value];
            }

            return value;
        });
        
        fs.writeFile(path.resolve(__dirname, myPath), myData, function (err) {
            if (err) { throw "Backup Failed"; }
            
            return true;
        });
    }

    _readFromFile(myObj, myPath){
        var data = fs.readFileSync(path.resolve(__dirname, myPath));
        if(data.toString() == ""){
            return false;
        }
        
        try{
            var tempObj = JSON.parse(data);
            for(var k in tempObj){
                myObj[k]=tempObj[k];
            }

            if("SET KEYS" in myObj){
                myObj["SET KEYS"].forEach(k => {
                    this.k_s[k] = new Set(this.k_s[k]); 
                });
            }   
        }catch(err){
            console.log(chalk.red("Backup Retreival Failed. Using new instance"));
        }

        return true;
    }

    persist(){
        this._saveToFile(this.k_s, this.backup_folder + "/keyStore.json");
        this._saveToFile(this.scoreOfValue, this.backup_folder + "/scoreOfValue.json");
    }

    extract(){
        this._readFromFile(this.k_s, this.backup_folder + "/keyStore.json");
        this._readFromFile(this.scoreOfValue, this.backup_folder + "/scoreOfValue.json");
    }

    initalize(){
        this.extract();
        setInterval(()=>{
            //console.log("backed up");
            this.persist();
        }, this.snapshot_interval * 1000);
    }
};


module.exports.createClient = (config) => {
    if (!config.snapshot_interval) {
        config.snapshot_interval = 120;

        console.info('Snapshot interval not specified, using 120s as default')
    }

    if (!config.backup_folder) {
        config.backup_folder = __dirname + '/../backup';

        console.info('Backup folder not specified, using default')
    }

    config.backup_folder = __dirname + '/../' + config.backup_folder;

    let newClient = new myRedis(config);
    newClient.initalize();
    return newClient;
}