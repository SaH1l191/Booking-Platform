


export const validateSchemaBody = (schema: any) => {
    return (req: any, res: any, next: any) => {
        try {
            schema.parse(req.body)
            next()
        } catch (error) {
            next(error)
        }
    }
}