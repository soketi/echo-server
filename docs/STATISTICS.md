# Application Statistics

Each app can have statistics stored to be processed further by the SDK clients. This feature is disabled by default, but can be activated by setting the `enableStats` to `true`.

# Endpoints

## `GET /apps/{appId}/stats`

Get the list of stats. Additional parameters may be used to narrow the results.

- `?start=now-7d` - the start (in UNIX format) of the range
- `?end=now` - the end (in UNIX format) of the range

## `GET /apps/{appId}/stats/current`

Get the current stats (the latest ones). **This might not be available on all drivers!**

# Drivers

Currently, there are two types of drivers, both which handle the data differently and format the data differently when retrieved via the REST API.

When retrieving the stats, they are formatted like this:

```json
{
    "stats": {
        "connections": {
            "points": [
                {
                    "time": 1615479187,
                    "avg": 1,
                    "max": 1
                }
            ]
        },
        "api_messages": {
            "points": [
                {
                    "time": 1615479187,
                    "value": 0,
                }
            ]
        },
        "ws_messages": {
            "points": [
                {
                    "time": 1615479187,
                    "value": 0,
                }
            ]
        }
    }
}
```

**Please note, this type will always have matching timestamps on either side of the stats array.**
