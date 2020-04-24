# redis-impl

It's an implementation of some basic functionalities of redis.

## Running the Program

* install the dependencies
```
npm install
```
* set up the config file
```
{
    "snapshot_interval": "120",
    "backup_folder": "./backup"
}
```
* start the application
```
npm start
```

## Commands Supported
* SET - Initialize the key
* GET - Returns value of key if present
* DEL - Deleted the key
* EXISTS - Checks whether a key exists
* FLUSHALL - Deletes all the key
* MSET - Initialize multiple keys
* MGET - Access multiple keys
* EXPIRE - Sets expiry time on the key
* SETEX - Set key and its expiry.
* TTL - Get the remaining time of key expiry in seconds
* INCR - Increment the key by 1
* DECR - Decrement the key by 1
* RENAME - Rename the key
* APPEND - Append to a key
* LPUSH - Insert all the specified values at the head of the list stored at key.
* RPUSH - Insert all the specified values at the tail of the list stored at key.
* LPOP - Removes and returns the first element of the list stored at key.
* RPOP - Removes and returns the last element of the list stored at key.
* LLEN - Returns the length of the list stored at a key
* LRANGE - Returns the specified range of elements in the list stored at key.
* SADD - Add the specified members to the set stored at key.
* SISMEMBER - Returns if member is a member of the set stored at key.
* SMEMBERS - Returns all the members of the set value stored at key.
* SCARD - Returns the set cardinality (number of elements) of the set stored at key.
* ZADD - Adds all the specified members with the specified scores to the sorted set stored at key.
* ZRANGE - Returns the specified range of elements in the sorted set stored at key. The elements are considered to be ordered from the lowest to the highest score.
* ZRANK - Returns the rank of member in the sorted set stored at key, with the scores ordered from low to high.


## Examples
1)
```
SET myKey 5                         //"OK"
GET myKey                           //"5"
```

2)
```
LPUSH myList 2 3 1 5 3               //"5"
LRANGE myList 0 -1                   //[ '3', '5', '1', '3', '2' ]
```

3)
```
ZADD mySortedSet 3 6 3 1 6 8 6 4 3 8  //"(integer) 4"
ZRANGE mySortedSet 0 -1 withscores    //[ [ '6 | 3' ], [ '1 | 3' ], [ '8 | 3' ], [ '4 | 6' ] ]
ZRANK mySortedSet 8                   //"2"
```



## Default Settings
If no config file is present then the default settings will be implied:
```
{
    "snapshot_interval": "120",
    "backup_folder": "./backup"
}
```


## Data Persistency
Data is backed up in file system at regular intervals as specified in the config file.

## Technologies Used
* [nodeJs](https://nodejs.org/en/) - Backend runtime environment
* [Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - Programming Language
* [npm](https://www.npmjs.com/) - package manager for javascript

## Further Discussions
**Q:** Why Javascript?

**A:**
Redis is generally known as a single-process, single-thread model. This is not true. Redis also runs multiple backend threads to perform backend cleaning works, such as cleansing the dirty data and closing file descriptors. In Redis, the main thread is responsible for the major tasks, including but not limited to: receiving the connections from clients, processing the connection read/write events, parsing requests, processing commands, processing timer events, and synchronizing data. Only one CPU core runs a single process and single thread.
Therefore I chose Javascript as the primary programming language for this project as it has a single threaded event loop and uses separate worker threads for file operations and hence doesn't block the main event loop (enabling it to scale better to multiple requests).


**Q:** Improvement Scope?

**A:**
Current version is a CLI and persists backup on file system. In future it'll be extended to a Server API with backup persisting on scalable DB.  


**Q:** Data Structure Used?

**A:**
Array,
Set,
Hashmap


**Q:** Async Operations (multithreading)?

**A:** nodeJs provides worker thread pool for async operations. Using this functionality I implemented intermittent backup function to run on a separate thread of execution so as to not block the main event loop. After regular snapshot intervals (as specified in the config file), javascript spawns a separate worker thread to write the data in a json in file system. This thread executes parallel to the primary event loop (Simultaneous multithreading) and doesn't block the user from interacting with the CLI.  

