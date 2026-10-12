import { NotFoundException } from '@nestjs/common';
import { CoursesMeController } from './courses.me.controller';
import { CoursesService } from './courses.service';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';

const req = { user: { id: 7 } } as RequestWithUser;

function setup(owned = true) {
  const service = {
    assertOwnedBy: jest.fn(async () => {
      if (!owned) throw new NotFoundException('Course not found');
    }),
    createCourse: jest.fn(async () => ({ id: 1 })),
    updateCourse: jest.fn(async () => ({ id: 1 })),
    createVideoCourse: jest.fn(async () => ({ id: 2 })),
    deleteCourse: jest.fn(),
    markUnreviewed: jest.fn(),
  };
  const controller = new CoursesMeController(
    service as unknown as CoursesService,
  );
  return { service, controller };
}

describe('CoursesMeController', () => {
  it('creates a manual course owned by the caller, whatever the body says', async () => {
    const { service, controller } = setup();
    await controller.create(req, {
      name: 'x',
      creationMode: 'auto',
      organizationId: '1',
      udemyQuestionBanks: 50,
    } as never);

    const [dto, ownerId] = service.createCourse.mock.calls[0] as unknown as [
      Record<string, unknown>,
      number,
    ];
    expect(ownerId).toBe(7);
    expect(dto.creationMode).toBe('manual');
    expect(dto.organizationId).toBeUndefined();
    expect(dto.udemyQuestionBanks).toBeUndefined();
  });

  it('refuses to touch a course the caller does not own', async () => {
    const { service, controller } = setup(false);
    await expect(controller.update(req, 1, {})).rejects.toThrow(
      NotFoundException,
    );
    await expect(controller.remove(req, 1)).rejects.toThrow(NotFoundException);
    expect(service.updateCourse).not.toHaveBeenCalled();
    expect(service.deleteCourse).not.toHaveBeenCalled();
  });

  it('puts an edited course back in the review queue', async () => {
    const { service, controller } = setup();
    await controller.update(req, 1, { name: 'y' });
    expect(service.assertOwnedBy).toHaveBeenCalledWith(1, 7);
    expect(service.markUnreviewed).toHaveBeenCalledWith(1);
  });
});
