import express from "express";
import Book from "../models/Book.js";
import cloudinary from "../lib/cloudinary.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectedRoute, async (req, res) => {
  try {
    const { title, caption, image, rating } = req.body;
    if (!title || !caption || !rating) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // upload image to cloudinary
    let imageUrl = "";
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Logic to save the book to the database
    const newBook = new Book({
      title,
      caption,
      image: imageUrl,
      rating,
      user: req.user._id,
    });
    await newBook.save();
    res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", protectedRoute, async (req, res) => {
  //{ user: req.user._id }
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const totalBooks = await Book.countDocuments();
    const totalPages = Math.ceil(totalBooks / limit);
    const books = await Book.find()
      .sort({ createdAt: -1 }) // descending order
      .skip(skip)
      .limit(limit)
      .populate("user", ["username", "profileImage"]);
    res.send({
      books,
      currentPage: page,
      totalPages,
      totalBooks,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// get reccommended books by user id

router.get("/user", protectedRoute, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user._id }).sort({
      createdAt: -1,
    }); // descending order
    res.json(books);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", protectedRoute, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (book.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    // Delete image from cloudinary
    if (book.image && book.image.includes("cloudinary")) {
      try {
        const publicId = book.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
    await book.deleteOne();
    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
