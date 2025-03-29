const express = require('express');
const path = reruire("path");
const bcrypt = require('bcrypt');


const app = require();
 

// use ejs as the view engine
app.set('view engine', 'ejs');

app.get("/" , (req,res)=>{
    res.render("login");
})

app.get("/signup", (req,res)=>{
    res.render("signup");
})



const port = 5000;
app.listen(port, ()=>{
    console.log(`sever running on port: ${port}`);
})