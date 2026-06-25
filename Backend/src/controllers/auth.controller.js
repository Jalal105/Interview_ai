const userModel = require("../models/user.model")

const bcrypt =require("bcryptjs")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
const tokenBlacklistModel = require("../models/blacklist.model")

/**
 * @name registerUserController
 * @desc register a new user, expects username,email and password in the request body
 * @access Public
 */

async function registerUserController(req,res){
    const { username,email,password}=req.body

    if(!username || !email || !password){
        return res.status(400).json({
            message:"Please provide username, email and password"
        })
    }
    const isUserAlreadyExist = await userModel.findOne({
        $or: [{username},{email}]
    })
    if(isUserAlreadyExist){
        return res.status(400).json({
            message:"User already exist with this username or email"
        })
    }
    const hash=await bcrypt.hash(password,10)

    const user = await userModel.create({
        username,
        email,
        password:hash
    })

    const token =jwt.sign(
        { id: user._id, username:user.username },
        process.env.JWT_SECRET,
        { expiresIn : "1d" }
    )

    res.cookie("token",token)

    res.status(201).json({
        message:"User registered successfully",
        user:{
            id: user._id,
            username: user.username,
            email:user.email
        }
    })


}

/**
 * @name loginUserController
 * @desc login a user, expects email and password in the request body
 * @access Public
 */

async function loginUserController(req,res){
    try {
        const { email,password }=req.body

        if(!email || !password){
            return res.status(400).json({
                message:"Please provide email and password"
            })
        }

        const user = await userModel.findOne({ email })

        if(!user){
            return res.status(400).json({
                message:"Invalid email or password"
            })
        }

        const isPasswordValid =await bcrypt.compare(password,user.password)

        if(!isPasswordValid){
            return res.status(400).json({
                message:"Invalid email or password"
            })
        }

        const token =jwt.sign(
            { id: user._id, username:user.username },
            process.env.JWT_SECRET,
            { expiresIn : "1d" }
        )

        res.cookie("token",token)
        res.status(200).json({
            message:"User logged in successfully",
            user:{
                id:user._id,
                username: user.username,
                email:user.email
            }
        })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({
            message: "Internal server error during login"
        })
    }

}

async function logoutUserController(req,res){
    const token =req.cookies.token
    if(token){
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token")

    res.status(200).json({
        message:"User logged out successfully"
    })

}

async function getMeController(req,res){
    const user=await userModel.findById(req.user.id)

    res.status(200).json({
        message:"User details fetched successfully",

        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}