const casper = require('casper').create({
    waitTimeout: 5000, // 5s
    verbose: true,
    logLevel: 'error',
    pageSettings: {
        loadImages: false,
        loadPlugins: false
    }
}),
    config = require('config.json'),
    target_date = config['target_date'] || formatDate(),
    url = config['url'],
    menu_url = config['menu_url'],
    username = config['username'],
    password = config['password'],
    fs = require('fs');

casper.userAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36');

casper.start(url, function login() {
    this.echo('step 1: login');
    this.waitForSelector('form#login', function () {
        this.fill('form#login', {
            'userAccount': username,
            'password': password,
        }, true)
    });
});

casper.then(function open() {
    this.echo(`step 2. download`);
    this.waitForText('日常管理', function () {        
        this.thenOpen(menu_url, function () {
            this.waitForText('一周菜谱', function() {
                let header = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(1)').innerHTML.replace(/\s/g,'');
                }),
                senior_breakfast = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(2)').innerHTML.replace(/\s/g,'');
                }),
                senior_lunch = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(3)').innerHTML.replace(/\s/g,'');
                }),
                senior_snack = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(4)').innerHTML.replace(/\s/g,'');
                }),
                junior_breakfast = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(5)').innerHTML.replace(/\s/g,'');
                }),
                junior_lunch = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(6)').innerHTML.replace(/\s/g,'');
                }),
                junior_snack = this.evaluate(function() {
                    return __utils__.findOne('table tr:nth-child(7)').innerHTML.replace(/\s/g,'');
                });

                let header_line = parseHeader(header),
                    senior_breakfast_line = parseMenu(senior_breakfast),
                    senior_lunch_line = parseMenu(senior_lunch),
                    senior_snack_line = parseMenu(senior_snack),
                    junior_breakfast_line = parseMenu(junior_breakfast),
                    junior_lunch_line = parseMenu(junior_lunch),
                    junior_snack_line = parseMenu(junior_snack);

                const output = header_line + '\r\n' + 
                        senior_breakfast_line + '\r\n' + 
                        senior_lunch_line + '\r\n' + 
                        senior_snack_line + '\r\n' + 
                        junior_breakfast_line + '\r\n' + 
                        junior_lunch_line + '\r\n' + 
                        junior_snack_line;

                if (output.length > 0) {
                    // workingDirectory is defined by phantomjs, use process.cwd() in nodejs
                    fs.write(fs.pathJoin(fs.workingDirectory, 'output', 'output.csv'), output, 'w');
                }
            });
        });
    });
});

casper.run();

// ------------------------ event handlers ------------------------
casper.on('remote.message', function (msg) {
    this.echo('remote.msg: ' + msg);
});

casper.on('error', function (msg) {
    this.die(msg);
});

casper.on('run.complete', function () {
    this.echo('completed');
    this.exit();
});

// ------------------------ helpers ------------------------
function formatDate(date) {
    let d = new Date(date);
    if (date instanceof Date) {
        d = new Date(date);
    }
    let month = '' + (d.getMonth() + 1),
        day = '' + d.getDate();        

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [month, day].join('-');
}

// parse header line
function parseHeader(header) {
    const headerline_regex_pattern = /<th>菜单名称<\/th><th>餐别<\/th><th>星期一<span>(\d{2}-\d{2})<\/span><\/th><th>星期二<span>(\d{2}-\d{2})<\/span><\/th><th>星期三<span>(\d{2}-\d{2})<\/span><\/th><th>星期四<span>(\d{2}-\d{2})<\/span><\/th><th>星期五<span>(\d{2}-\d{2})<\/span><\/th>/;
    let matches = header.match(headerline_regex_pattern);
    if (matches.length != 6) {
        return "";
    }

    // remove first element and join
    matches.shift();    
    return matches.join(",");
}

// parse menu line
function parseMenu(menu) {    
    const menuline_regex_pattern = /^.*(<td><span>(.+)<\/span><\/td><td><span>(.+)<\/span><\/td><td><span>(.+)<\/span><\/td><td><span>(.+)<\/span><\/td><td><span>(.+)<\/span><\/td><td><span>(.+)<\/span><\/td><td><span>(.+)<\/span><\/td>).*$/;
    let matches = menu.match(menuline_regex_pattern);
    if (matches.length != 9) {
        return "";
    }

    // remove first two element and join by comma
    matches.shift();
    matches.shift();
    matches.pop();
    matches.pop();

    return matches.map(function(item) {
        item = item.replace(/<br>/g, "|");
        if (item.charAt(0) == '|') {
            item = item.substr(1);
        }
        return item;
    }).join(",");
}