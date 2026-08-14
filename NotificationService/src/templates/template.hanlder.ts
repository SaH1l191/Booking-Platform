import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { InternalServerError } from '../utils/errors/app.error';


export async function renderMailTemplate(templateId: string, params: Record<string, any>): Promise<string> {
    const templateFile = `${templateId}.hbs`;
    const templateCandidates = [
        path.join(__dirname, 'mail', templateFile),
        path.join(process.cwd(), 'src', 'templates', 'mail', templateFile),
        path.join(process.cwd(), 'dist', 'src', 'templates', 'mail', templateFile)
    ];

    try {
        const templatePath = await resolveTemplatePath(templateCandidates);
        const content = await fs.readFile(templatePath, 'utf-8');
        const finalTemplate = Handlebars.compile(content);
        return finalTemplate(params);
    } catch (error) {
        throw new InternalServerError(`Template not found: ${templateId}`);
    }
}

async function resolveTemplatePath(candidates: string[]): Promise<string> {
    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            continue;
        }
    }

    throw new Error('Template file not found in any known location');
}