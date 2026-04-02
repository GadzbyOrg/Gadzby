import { describe, expect, it } from "vitest";
import {
	createUserSchema,
	importUserRowSchema,
	updateUserSchema,
} from "../schemas";

describe("User Input Sanitization", () => {
	describe("updateUserSchema", () => {
		it("should trim and lowercase email", () => {
			const data = {
				email: "  TEST@EXAMPLE.COM  ",
				phone: " 0102030405 ",
				bucque: " Bucque ",
			};
			const result = updateUserSchema.parse(data);
			expect(result.email).toBe("test@example.com");
			expect(result.phone).toBe("0102030405");
			expect(result.bucque).toBe("Bucque");
		});

		it("should handle empty strings and optional fields", () => {
			const data = {
				email: "test@example.com",
				phone: "   ",
				bucque: "",
			};
			const result = updateUserSchema.parse(data);
			expect(result.phone).toBe("");
			expect(result.bucque).toBe("");
		});
	});

	describe("createUserSchema", () => {
		it("should trim all string fields", () => {
			const data = {
				nom: "  Doe  ",
				prenom: "  John  ",
				email: "  john@example.com  ",
				promss: "  220  ",
				password: "  password123  ",
				roleId: "00000000-0000-0000-0000-000000000000",
				tabagnss: "CH",
			};
			const result = createUserSchema.parse(data);
			expect(result.nom).toBe("Doe");
			expect(result.prenom).toBe("John");
			expect(result.email).toBe("john@example.com");
			expect(result.promss).toBe("220");
			expect(result.password).toBe("password123");
		});
	});

	describe("importUserRowSchema", () => {
		it("should trim and uppercase promss", () => {
			const data = {
				nom: "  Doe  ",
				prenom: "  Jane  ",
				email: "  JANE@EXAMPLE.COM  ",
				promss: "  ai223  ",
				tabagnss: "  Chalon'ss  ",
			};
			const result = importUserRowSchema.parse(data);
			expect(result.nom).toBe("Doe");
			expect(result.prenom).toBe("Jane");
			expect(result.email).toBe("jane@example.com");
			expect(result.promss).toBe("AI223");
			expect(result.tabagnss).toBe("Chalon'ss");
		});
	});
});
