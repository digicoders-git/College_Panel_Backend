const router = require("express").Router();
const { addRole, getRoles, getPermissions, updateRole, deleteRole } = require("../controllers/role.controller");
const { protect, collegeOnly } = require("../middlewares/auth");
const { validateRole } = require("../middlewares/validators");

router.use(protect, collegeOnly);

router.get("/permissions", getPermissions);
router.post("/", validateRole, addRole);
router.get("/", getRoles);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

module.exports = router;
