var express = require('express');
var util = require('util');
var moment = require('moment');
var router = express.Router();
require('../core/CommonUtil');
require('../core/HttpWrapper');
require('../core/SqlClient');
require('../model/model');


router.get('/', function (req, res, next) {
    // console.log(process.execPath);
    // console.log(__dirname);
    // console.log(process.cwd());

    res.redirect('/cms/index');
});

router.get('/index', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;

    if (website) {
        if (user) {
            res.render('cms/index', {user: user, website: website});
        } else {
            res.redirect('/cms/login');
        }
    } else {
        var sqlClient = new SqlClient();
        website = new Website();
        sqlClient.query(website, function (result) {
            if (result != null && result.length > 0) {
                website = result[0];
                res.cookie('website', website, {maxAge: 60 * 60 * 1000}); //24 * 60 * 60 * 1000
                if (user) {
                    res.render('cms/index', {user: user, website: website});
                } else {
                    res.redirect('/cms/login');
                }
                return;
            }
            res.redirect('/cms/logout');
        });
    }
});

router.get('/login', function (req, res, next) {
    res.render('cms/login', {username: ''});
});

router.get('/logout', function (req, res, next) {
    //清空user信息
    res.cookie('user', null, {maxAge: 0});
    res.cookie('website', null, {maxAge: 0});
    res.redirect('/cms/login');
});

router.post('/login', function (req, res, next) {
    var sqlClient = new SqlClient();
    var user = new User();

    sqlClient.query(user, function (result) {
        if (result != null && result.length > 0) {
            user = result[0];
            if (user.password != req.body.password) {
                res.render('cms/login', {status: 2, msg: '密码错误!', username: req.body.username});
                return;
            }
            if (user.createtime) user.createtime = moment(user.createtime).format("YYYY-MM-DD");
            if (user.lastlogintime) user.lastlogintime = moment(user.lastlogintime).format("YYYY-MM-DD");
            res.cookie('user', user, {maxAge: 60 * 60 * 1000}); //24 * 60 * 60 * 1000
            res.redirect('/cms/index');
            return;
        }
        res.render('cms/login', {status: 3, msg: '帐号不存在!', username: req.body.username});
    }, util.format(" where username='%s'", req.body.username));
});


// 用户中心
router.get('/user/center', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/user/center', {user: user, website: website});
});
// 修改用户信息
router.post('/user/center', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    var entity = new User();
    entity.username = req.body.username;
    entity.displayname = req.body.displayname;
    entity.createtime = req.body.createtime;
    entity.lastlogintime = req.body.lastlogintime;
    entity.status = req.body.status && req.body.status == 'on' ? true : false;
    entity.id = user.id;
    entity.avatar = user.avatar;

    var sqlClient = new SqlClient();
    sqlClient.update(entity, function (result) {
        if (result != null && result > 0) {
            if (entity.createtime) entity.createtime = moment(entity.createtime).format("YYYY-MM-DD");
            if (entity.lastlogintime) entity.lastlogintime = moment(entity.lastlogintime).format("YYYY-MM-DD");
            res.cookie('user', entity, {maxAge: 60 * 60 * 1000}); //24 * 60 * 60 * 1000
            res.render('cms/user/center', {status: 1, msg: '修改成功!', user: entity, website: website});
            return;
        }
        res.render('cms/user/center', {status: 2, msg: '修改失败!', user: entity, website: website});
    });

});

// 设置密码
router.get('/user/forget', function (req, res, next) {
    // var user = req.cookies.user;
    // if(!user) { res.redirect('/cms/login'); return; }
    res.render('cms/user/forget');
});


// 公司基本信息
router.get('/company', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }

    var sqlClient = new SqlClient();
    var company = new Company();
    sqlClient.query(company, function (result) {
        if (result != null && result.length > 0) {
            company = result[0];
            if (company.regist_date) company.regist_date = moment(company.regist_date).format("YYYY-MM-DD");
            res.render('cms/company', {status: 1, msg: '已获取公司信息!', user: user, website: website, company: company});
            return;
        }
        res.render('cms/company', {status: 3, msg: '公司不存在!', user: user, website: website, company: company});
    });
});
// 更新公司信息
router.post('/company', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }

    var sqlClient = new SqlClient();
    var company = new Company();
    company.id = req.body.id ? req.body.id : null;
    company.company_name = req.body.company_name;
    company.description = req.body.description;
    company.address = req.body.address;
    company.company_type = req.body.company_type;
    company.company_size = req.body.company_size;
    company.regist_capital = req.body.regist_capital;
    company.regist_date = req.body.regist_date;
    company.business_model = req.body.business_model;
    company.business_scope = req.body.business_scope;

    var isInsert = false;
    var callback = function (result) {
        if (result != null && result > 0) {
            if (isInsert) company.id = result;
            if (company.regist_date) company.regist_date = moment(company.regist_date).format("YYYY-MM-DD");
            res.render('cms/company', {status: 1, msg: '更新成功!', user: user, website: website, company: company});
            return;
        }
        res.render('cms/company', {status: 2, msg: '更新失败!', user: user, website: website, company: company});
    };

    if (company.id == null || company.id == "null") {
        isInsert = true;
        sqlClient.create(company, callback);
    } else {
        isInsert = false;
        sqlClient.update(company, callback);
    }
});


// 公司联系方式
router.get('/contact', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }

    var sqlClient = new SqlClient();
    var contact = new Contact();
    sqlClient.query(contact, function (result) {
        if (result != null && result.length > 0) {
            contact = result[0];
            res.render('cms/contact', {status: 1, msg: '已获取联系方式!', user: user, website: website, contact: contact});
            return;
        }
        res.render('cms/contact', {status: 3, msg: '联系方式不存在!', user: user, website: website, contact: contact});
    });
});
// 更新联系方式
router.post('/contact', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }

    var sqlClient = new SqlClient();
    var contact = new Contact();
    contact.id = req.body.id ? req.body.id : null;
    contact.contact_name = req.body.contact_name;
    contact.contact_phone = req.body.contact_phone;
    contact.contact_email = req.body.contact_email;
    contact.contact_mobile = req.body.contact_mobile;
    contact.contact_fax = req.body.contact_fax;
    contact.contact_qq = req.body.contact_qq;
    contact.location_lng = req.body.location_lng;
    contact.location_lat = req.body.location_lat;

    var isInsert = false;
    var callback = function (result) {
        if (result != null && result > 0) {
            if (isInsert) contact.id = result;
            res.render('cms/contact', {status: 1, msg: '更新成功!', user: user, website: website, contact: contact});
            return;
        }
        res.render('cms/contact', {status: 2, msg: '更新失败!', user: user, website: website, contact: contact});
    };

    if (contact.id == null || contact.id == "null") {
        isInsert = true;
        sqlClient.create(contact, callback);
    } else {
        isInsert = false;
        sqlClient.update(contact, callback);
    }
});


// 通知公告
router.get('/notice', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/notice', {user: user, website: website});
});
// 新闻中心
router.get('/news', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/news', {user: user, website: website});
});
// 产品管理
router.get('/product', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/product', {user: user, website: website});
});
// 分类管理
router.get('/category', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/category', {user: user, website: website});
});
// 荣誉证书
router.get('/honor', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/honor', {user: user, website: website});
});
// 公司相册
router.get('/photo', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/photo', {user: user, website: website});
});
// 评论留言
router.get('/comment', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/comment', {user: user, website: website});
});


// 网站信息
router.get('/website', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }
    res.render('cms/website', {user: user, website: website});
});
// 更新网站信息
router.post('/website', function (req, res, next) {
    var user = req.cookies.user;
    var website = req.cookies.website;
    if (!user) {
        res.redirect('/cms/login');
        return;
    }

    var sqlClient = new SqlClient();
    var website = new Website();
    website.id = req.body.id ? req.body.id : null;
    website.siteurl = req.body.siteurl;
    website.title = req.body.title;
    website.description = req.body.description;
    website.keywords = req.body.keywords;
    website.logo = req.body.logo;
    website.carousel = req.body.carousel;
    website.icp_num = req.body.icp_num;
    website.support_name = req.body.support_name;
    website.support_url = req.body.support_url;
    website.views = req.body.views;

    var isInsert = false;
    var callback = function (result) {
        if (result != null && result > 0) {
            if (isInsert) website.id = result;
            res.cookie('website', website, {maxAge: 60 * 60 * 1000}); //24 * 60 * 60 * 1000
            res.render('cms/website', {status: 1, msg: '更新成功!', user: user, website: website});
            return;
        }
        res.render('cms/website', {status: 2, msg: '更新失败!', user: user, website: website});
    };

    if (website.id == null || website.id == "null") {
        isInsert = true;
        sqlClient.create(website, callback);
    } else {
        isInsert = false;
        sqlClient.update(website, callback);
    }
});


module.exports = router;