import { ValidationPipe, ValidationPipeOptions, UnprocessableEntityException } from "@nestjs/common";
import { ValidationError } from "class-validator";

export class UnprocessibleEntityValidationPipe extends ValidationPipe {
    constructor(options: ValidationPipeOptions = {}) {
        options.exceptionFactory = (originalErrors: ValidationError[]) => {
            const errors = originalErrors.map(
              (error: ValidationError) =>
              error.children.map(
                (child: ValidationError) => [ child.property, Object.values(child.constraints) ]
              )
            )
            .reduce((acc, errors) => acc.concat(errors), [])

            return new UnprocessableEntityException({
              errors: Object.fromEntries(errors)
            })
          }

        super(options)
    }
}