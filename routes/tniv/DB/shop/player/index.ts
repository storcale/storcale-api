router.get('/', (req:any, res:any) => {

    res.status(200).send("Player endpoint");
});

module.exports = router;